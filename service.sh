#!/usr/bin/env bash
# Local preview lifecycle; requires Python 3 (macOS / Linux).
set -euo pipefail
exec python3 - "$0" "${@:-status}" <<'PY'
import fcntl
import json
import os
from pathlib import Path
import shlex
import signal
import socket
import subprocess
import sys
import time
import urllib.request

root = Path(sys.argv[1]).resolve().parent
action = sys.argv[2]
if len(sys.argv) != 3 or action not in ('start', 'stop', 'restart', 'status'):
    sys.exit('用法: ./service.sh {start|stop|restart|status}（启动端口: PORT=8001 ./service.sh start）')
runtime = root / '.runtime'
runtime.mkdir(exist_ok=True)
state_file = runtime / 'service.json'
log_file = runtime / 'service.log'


def command(port):
    return ['-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(root)]


def owned(state):
    if not state or not isinstance(state.get('pid'), int) or state['pid'] <= 1:
        return False
    result = subprocess.run(['ps', '-p', str(state['pid']), '-o', 'stat=', '-o', 'args='],
                            capture_output=True, text=True)
    parts = result.stdout.strip().split(None, 1)
    return (len(parts) == 2 and 'Z' not in parts[0]
            and shlex.split(parts[1])[1:] == ['-u', *command(state.get('port'))])


def read_state():
    try:
        state = json.loads(state_file.read_text())
        return state if isinstance(state, dict) else None
    except (OSError, ValueError):
        return None


def stop():
    state = read_state()
    if not owned(state):
        state_file.unlink(missing_ok=True)
        print('服务未运行（不会终止其他进程）。')
        return
    os.kill(state['pid'], signal.SIGTERM)
    for _ in range(50):
        if not owned(state):
            state_file.unlink(missing_ok=True)
            print('服务已停止。')
            return
        time.sleep(0.1)
    sys.exit('服务未能在 5 秒内退出，请检查进程；PID 记录已保留。')


def start():
    state = read_state()
    if owned(state):
        print(f"服务已运行: http://127.0.0.1:{state['port']}/（PID {state['pid']}）")
        return
    try:
        port = int(os.environ.get('PORT', '8000'))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        sys.exit('PORT 必须是 1 到 65535 之间的整数。')
    try:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', port))
    except OSError as error:
        sys.exit(f'无法使用端口 {port}: {error}。不会停止占用端口的其他进程。')
    state_file.unlink(missing_ok=True)
    with log_file.open('ab') as log:
        proc = subprocess.Popen([sys.executable, '-u', *command(port)], cwd=root,
                                stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                start_new_session=True, close_fds=True)
    state = {'pid': proc.pid, 'port': port}
    state_file.write_text(json.dumps(state) + '\n')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for _ in range(50):
        if proc.poll() is not None:
            break
        try:
            with opener.open(f'http://127.0.0.1:{port}/index.html', timeout=0.5) as response:
                if response.status == 200 and proc.poll() is None:
                    print(f'服务已启动: http://127.0.0.1:{port}/（PID {proc.pid}）')
                    print(f'日志: {log_file}')
                    return
        except OSError:
            pass
        time.sleep(0.1)
    if proc.poll() is None:
        proc.terminate()
        proc.wait(timeout=5)
    state_file.unlink(missing_ok=True)
    sys.exit(f'服务启动失败，请查看日志: {log_file}')


# Serialize concurrent lifecycle commands for this checkout.
with (runtime / 'service.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    if action == 'status':
        state = read_state()
        if owned(state):
            print(f"服务运行中: http://127.0.0.1:{state['port']}/（PID {state['pid']}）")
        else:
            print('服务未运行（脚本未管理任何运行中的进程）。')
    else:
        if action in ('stop', 'restart'):
            stop()
        if action in ('start', 'restart'):
            start()
PY

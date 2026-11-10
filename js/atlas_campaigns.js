/**
 * Campaign Playback Module (战役推演)
 * Renders two-sided army movements, fortification lines, encirclements and clash sites
 * for selected battles, phase by phase, on top of the historical atlas.
 * Attaches onto HistoricalAtlasController.prototype through the shared mixin queue.
 *
 * Geometry is a schematic reconstruction from classical sources, not a survey.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  // Side colours: pick from this palette so every campaign matches the parchment map.
  // A side may also give its own `color`; the first side defaults to ink, the second to cinnabar.
  const SIDE_PALETTE = {
    ink: '#2b2622',
    cinnabar: '#b5452f',
    indigo: '#2f4f73',
    teal: '#275d52',
    ochre: '#a6741f',
    plum: '#6b3a5a',
  };
  const DEFAULT_SIDE_TONES = ['ink', 'cinnabar', 'indigo', 'teal'];

  // Shared place anchors [lng, lat]
  const P = {
    xianyang: [108.7, 34.33],
    hangu: [110.87, 34.63],
    anyi: [111.13, 35.1],
    yewang: [112.93, 35.09],
    xinzheng: [113.74, 34.39],
    handan: [114.48, 36.61],
    fukou: [114.2, 36.43],
    shangdang: [112.88, 36.12],
    duanshi: [112.38, 35.75],
    tianjing: [112.98, 35.42],
    changping: [112.9, 35.8],
    kongcang: [112.73, 35.83],
    qinbi: [112.77, 35.8],
    yonglu: [112.83, 35.87],
    guandu: [114.001, 34.751], // Same anchor as the 200 CE milestone.
    guandu_ye: [114.62, 36.34],
    guandu_xu: [113.85, 34.03],
    guandu_liyang: [114.55, 35.67],
    guandu_baima: [114.53, 35.61], // Same anchor as the Baima lore event.
    guandu_yanjin: [114.34, 35.33],
    guandu_yangwu: [113.97, 35.05],
    guandu_wuchao: [114.18, 35.08], // Approximate Yanjin-area location; ancient site disputed.
  };

  // Fortification lines
  const FORT_KONGCANG = [[112.74, 35.95], [112.725, 35.86], [112.735, 35.77], [112.76, 35.69]];
  const FORT_DANHE = [[112.9, 36.0], [112.915, 35.9], [112.93, 35.8], [112.945, 35.7]];
  const FORT_BAILI = [[112.78, 36.0], [112.88, 36.015], [112.98, 36.0], [113.08, 35.985]];
  const FORT_QINBI = [[112.755, 35.93], [112.745, 35.85], [112.75, 35.76], [112.77, 35.69]];
  const FORT_QIN_EAST = [[113.06, 36.02], [113.075, 35.9], [113.07, 35.78], [113.05, 35.68]];

  const FORT_GUANDU_CAO = [[113.90, 34.79], [114.00, 34.80], [114.10, 34.79]];
  const FORT_GUANDU_YUAN = [[113.90, 34.90], [114.00, 34.91], [114.10, 34.90]];

  const CAMPAIGNS = {
    guandu: {
      key: 'guandu',
      zh: '官渡之战',
      en: 'Battle of Guandu',
      span: { zh: '199—200年 · 曹操 vs 袁绍', en: '199–200 CE · Cao Cao vs Yuan Shao' },
      yearRange: [199, 200],
      match: { dynastyKey: 'donghan', year: 200, site: '官渡' },
      sides: [
        { id: 'yuan', tone: 'ink', zh: '袁军', en: 'Yuan', lead: { zh: '袁绍 · 颜良、文丑、淳于琼', en: 'Yuan Shao · Yan Liang, Wen Chou' } },
        { id: 'cao', tone: 'cinnabar', zh: '曹军', en: 'Cao', lead: { zh: '曹操 · 荀攸、曹仁、徐晃', en: 'Cao Cao · Xun You, Xu Huang' } },
      ],
      source: {
        zh: '据《三国志·武帝纪》《袁绍传》《荀攸传》《张郃传》示意复原。兵力记载有异，不列双方总数；古黄河渡口、乌巢与行军路线均为近似，月份为农历。',
        en: 'Schematic after Sanguozhi (Cao Cao, Yuan Shao, Xun You, Zhang He). Army totals disputed; crossings, Wuchao and routes approximate. Months are lunar.',
      },
      phases: [
        {
          year: 199,
          date: { zh: '建安四年（199年）', en: '199 CE' },
          title: { zh: '袁绍谋南下，曹操备官渡', en: 'Yuan prepares to march south' },
          view: [113.25, 33.70, 115.15, 36.65],
          text: {
            zh: '袁绍击灭公孙瓒，控制河北，准备南下与曹操决战。曹操以许县（今河南许昌）为后方，遣军扼守黄河南岸，并在官渡（今河南中牟东北）构筑营垒。官渡扼住通往许县的要道，曹军可在此集中兵力，等待袁军远道而来。',
            en: 'After defeating Gongsun Zan, Yuan Shao prepares to move south from Hebei. Cao Cao guards the southern crossings and fortifies Guandu, northeast of modern Zhongmu, covering the road to his base at Xu.',
          },
          places: ['guandu'],
          arrows: [
            { side: 'yuan', pts: [P.guandu_ye, [114.65, 36.08], [114.60, 35.85], P.guandu_liyang], dashed: true, label: { zh: '拟南下黎阳', en: 'Toward Liyang' } },
            { side: 'cao', pts: [P.guandu_xu, [113.83, 34.27], [113.94, 34.51], P.guandu], label: { zh: '进屯官渡', en: 'Fortify Guandu' } },
          ],
          units: [
            { side: 'yuan', at: [113.98, 36.27], label: { zh: '袁绍', en: 'Yuan Shao' } },
            { side: 'cao', at: [113.42, 34.16], label: { zh: '曹操', en: 'Cao Cao' } },
          ],
        },
        {
          year: 200,
          date: { zh: '建安五年 二月—四月', en: '200 CE · lunar months 2–4' },
          title: { zh: '声西击东，曹军解白马', en: 'A feint relieves Baima' },
          view: [113.94, 35.20, 114.83, 35.85],
          text: {
            zh: '袁绍进驻黎阳（今河南浚县），遣颜良等围攻白马（今河南滑县）。曹操采纳荀攸之计，先向延津佯作渡河，诱使袁绍分兵西应，随即率轻兵急趋白马。张辽、关羽为前锋，关羽斩颜良，袁军败退，白马之围遂解。',
            en: 'Yuan Shao reaches Liyang and sends Yan Liang against Baima. Following Xun You’s plan, Cao Cao feints at Yanjin, then rushes east. Zhang Liao and Guan Yu lead the vanguard; Guan Yu kills Yan Liang and lifts the siege.',
          },
          places: ['guandu_yanjin', 'guandu_liyang'],
          arrows: [
            { side: 'yuan', pts: [P.guandu_liyang, [114.58, 35.64], P.guandu_baima] },
            { side: 'cao', pts: [[114.13, 35.26], [114.22, 35.30], P.guandu_yanjin], dashed: true, label: { zh: '佯渡', en: 'Feint' } },
            { side: 'cao', pts: [P.guandu_yanjin, [114.40, 35.42], [114.50, 35.51], P.guandu_baima], heavy: true },
          ],
          clashes: [{ at: P.guandu_baima, label: { zh: '白马解围', en: 'Baima relieved' } }],
          units: [{ side: 'cao', at: [114.07, 35.51], label: { zh: '张辽 · 关羽', en: 'Zhang Liao · Guan Yu' } }],
        },
        {
          year: 200,
          date: { zh: '建安五年 四月', en: '200 CE · lunar month 4' },
          title: { zh: '白马西撤，延津破追兵', en: 'Yuan’s pursuit fails at Yanjin' },
          view: [113.94, 35.20, 114.83, 35.85],
          text: {
            zh: '曹操迁徙白马百姓，沿河向西撤往延津（今河南延津北一带）。袁绍渡河追击，文丑与刘备率骑兵趋前。曹操令军士解鞍休息，以道旁辎重诱使追兵争抢，乘其队形散乱纵骑反击，文丑战死。此战不采用演义中关羽斩文丑的说法。',
            en: 'Cao Cao evacuates Baima westward. Wen Chou and Liu Bei pursue after Yuan’s crossing. Cao’s cavalry strikes while the pursuers scatter to seize baggage; Wen Chou dies. The historical record does not credit Guan Yu with killing him.',
          },
          places: ['guandu_baima'],
          arrows: [
            { side: 'cao', pts: [P.guandu_baima, [114.43, 35.52], [114.31, 35.44], [114.25, 35.33]], dashed: true, label: { zh: '迁民西撤', en: 'Evacuate west' } },
            { side: 'yuan', pts: [[114.60, 35.58], [114.52, 35.43], [114.40, 35.34], P.guandu_yanjin] },
            { side: 'cao', pts: [[114.14, 35.30], [114.23, 35.30], P.guandu_yanjin] },
          ],
          clashes: [{ at: P.guandu_yanjin, label: { zh: '延津 · 文丑战死', en: 'Yanjin · Wen Chou falls' } }],
        },
        {
          year: 200,
          date: { zh: '建安五年 八月', en: '200 CE · lunar month 8' },
          title: { zh: '袁军进阳武，曹操守官渡', en: 'The armies converge on Guandu' },
          view: [113.68, 34.57, 114.58, 35.40],
          text: {
            zh: '曹操退还官渡，袁绍进保阳武（今河南原阳一带），继而连营南逼。曹军出战不利，退入坚垒。袁军筑土山、起高橹向曹营射箭，又掘地道进攻；曹军以发石车和营内长堑应对。双方由机动作战转为营垒相持，粮食供应渐成胜负关键。',
            en: 'Cao Cao returns to Guandu. Yuan advances through Yangwu and presses south. After an unsuccessful attack, Cao holds his ramparts, countering towers with stone throwers and tunnels with trenches. Supply becomes decisive.',
          },
          places: ['guandu_yangwu', 'guandu'],
          arrows: [
            { side: 'cao', pts: [[114.29, 35.29], [114.19, 35.09], [114.13, 34.89], [114.06, 34.82]], dashed: true },
            { side: 'yuan', pts: [P.guandu_yanjin, [114.13, 35.17], P.guandu_yangwu, [113.98, 34.94]], heavy: true },
          ],
          forts: [
            { side: 'cao', pts: FORT_GUANDU_CAO, face: 1 },
            { side: 'yuan', pts: FORT_GUANDU_YUAN, face: -1 },
          ],
          units: [{ side: 'cao', at: [113.73, 34.69], label: { zh: '曹操', en: 'Cao Cao' } }],
        },
        {
          year: 200,
          date: { zh: '建安五年 九月', en: '200 CE · lunar month 9' },
          title: { zh: '官渡久相持，奇兵袭粮道', en: 'Stalemate and a supply raid' },
          view: [113.64, 34.57, 114.44, 35.22],
          text: {
            zh: '曹军在官渡粮少兵疲，曹操一度致书荀彧，商议退回许县，荀彧劝其坚守待变。荀攸得知袁军运粮车将至，建议遣徐晃、史涣截击，焚毁辎重。袁绍又令韩猛劫掠西道，曹仁将其击走，随后烧毁袁军粮运，双方继续争夺补给通道。',
            en: 'Short of grain, Cao considers retreat, but Xun Yu urges him to hold. Xun You sends Xu Huang and Shi Huan against Yuan’s supply convoy. Cao Ren also defeats Han Meng on the western road and burns supplies.',
          },
          places: ['guandu'],
          forts: [
            { side: 'cao', pts: FORT_GUANDU_CAO, face: 1 },
            { side: 'yuan', pts: FORT_GUANDU_YUAN, face: -1 },
          ],
          arrows: [
            { side: 'yuan', pts: [[114.33, 35.17], [114.28, 35.08], [114.23, 34.98]], dashed: true, label: { zh: '袁军粮运', en: 'Supply convoy' } },
            { side: 'cao', pts: [[114.08, 34.76], [114.20, 34.81], [114.30, 34.90], [114.27, 35.02]] },
          ],
          clashes: [{ at: [114.27, 35.02] }],
          units: [{ side: 'cao', at: [113.82, 35.08], label: { zh: '徐晃 · 史涣', en: 'Xu Huang · Shi Huan' } }],
        },
        {
          year: 200,
          date: { zh: '建安五年 十月', en: '200 CE · lunar month 10' },
          title: { zh: '许攸来奔，曹操夜袭乌巢', en: 'Cao raids the depot at Wuchao' },
          view: [113.64, 34.57, 114.44, 35.22],
          text: {
            zh: '许攸自袁营投曹，建议袭击乌巢粮屯（今河南延津一带，确址有争议）。曹操留曹洪、荀攸守营，自率步骑五千夜出，至乌巢纵火急攻淳于琼。袁绍遣骑救粮屯，又命张郃、高览攻曹营；曹操击破乌巢守军，袁军粮秣被焚，攻营之军亦未得手。',
            en: 'Defector Xu You reveals Yuan’s depot at Wuchao. Cao leaves Cao Hong and Xun You in camp and leads 5,000 men on a night raid. Yuan sends relief and attacks Cao’s camp with Zhang He and Gao Lan. Wuchao burns; the camp holds.',
          },
          places: ['guandu'],
          forts: [
            { side: 'cao', pts: FORT_GUANDU_CAO, face: 1 },
            { side: 'yuan', pts: FORT_GUANDU_YUAN, face: -1 },
          ],
          arrows: [
            { side: 'cao', pts: [[114.10, 34.76], [114.31, 34.86], [114.33, 35.03], P.guandu_wuchao], heavy: true },
            { side: 'yuan', pts: [[113.99, 34.89], [114.00, 34.85], [114.00, 34.81]], blocked: true },
            { side: 'yuan', pts: [[114.09, 34.92], [114.12, 35.01], [114.15, 35.07]], light: true },
          ],
          clashes: [{ at: P.guandu_wuchao, label: { zh: '乌巢焚粮', en: 'Wuchao burns' } }],
          units: [
            { side: 'cao', at: [113.85, 34.65], label: { zh: '曹洪 · 荀攸守营', en: 'Cao Hong · Xun You' } },
            { side: 'cao', at: [113.84, 35.09], label: { zh: '曹操 · 步骑五千', en: 'Cao Cao · 5,000' } },
          ],
        },
        {
          year: 200,
          date: { zh: '建安五年 十月以后', en: '200 CE · after lunar month 10' },
          title: { zh: '张郃高览降，袁绍败北', en: 'Yuan’s army collapses' },
          view: [113.67, 34.55, 114.86, 35.86],
          text: {
            zh: '乌巢败讯传来，张郃、高览率部降曹，袁军营中动摇，继而全线溃散。袁绍与袁谭弃军渡河北逃，曹军追击并收取辎重。官渡之胜扭转了袁强曹弱的局面，但河北尚未平定；曹操此后仍经历仓亭之战与多年征伐，才逐步消灭袁氏势力。',
            en: 'After Wuchao falls, Zhang He and Gao Lan surrender. Yuan’s army collapses; Yuan Shao and Yuan Tan flee across the Yellow River. Guandu turns the balance toward Cao, but conquering Hebei still takes years.',
          },
          places: ['guandu', 'guandu_liyang'],
          arrows: [
            { side: 'yuan', pts: [[114.00, 34.92], [114.09, 35.13], [114.33, 35.37], P.guandu_liyang], dashed: true, label: { zh: '袁绍北逃', en: 'Yuan flees north' } },
            { side: 'cao', pts: [P.guandu, [114.17, 34.96], [114.33, 35.16]], heavy: true },
          ],
          forts: [{ side: 'yuan', pts: FORT_GUANDU_YUAN, face: -1, lost: true }],
          units: [{ side: 'cao', at: [113.72, 35.46], label: { zh: '曹军追击', en: 'Cao pursues' } }],
        },
      ],
    },
    changping: {
      key: 'changping',
      zh: '长平之战',
      en: 'Battle of Changping',
      span: { zh: '前262—前260年 · 秦 vs 赵', en: '262–260 BCE · Qin vs Zhao' },
      yearRange: [-262, -259],
      match: { dynastyKey: 'zhanguo', year: -260, site: '长平' },
      sides: [
        {
          id: 'qin',
          tone: 'ink',
          zh: '秦军',
          en: 'Qin',
          lead: { zh: '王龁 → 白起（武安君）', en: 'Wang He → Bai Qi' },
        },
        {
          id: 'zhao',
          tone: 'cinnabar',
          zh: '赵军',
          en: 'Zhao',
          lead: { zh: '廉颇 → 赵括 · 约四十五万', en: 'Lian Po → Zhao Kuo · c. 450,000' },
        },
      ],
      source: {
        zh: '据《史记·白起王翦列传》《史记·廉颇蔺相如列传》示意复原，路线与阵地位置为近似。',
        en: 'Schematic reconstruction after the Shiji; routes and positions are approximate.',
      },
      phases: [
        {
          year: -262,
          date: { zh: '前262年', en: '262 BCE' },
          title: { zh: '秦拔野王，上党降赵', en: 'Qin takes Yewang; Shangdang defects to Zhao' },
          view: [108.2, 33.9, 115.0, 37.0],
          text:
            '秦将白起攻取韩国野王（今河南沁阳），截断太行南口，韩上党郡与国都新郑隔绝。韩王欲献上党求和，郡守冯亭不愿入秦，转以上党十七城降赵；赵孝成王听平原君之议受地，秦赵决战由此引发。',
          quote: '冯亭曰：“郑道已绝……不如以上党归赵。”',
          places: [],
          arrows: [
            {
              side: 'qin',
              pts: [P.xianyang, P.hangu, [112.2, 34.85], P.yewang],
              label: { zh: '白起攻韩 · 取野王', en: 'Bai Qi seizes Yewang' },
            },
            {
              side: 'zhao',
              dashed: true,
              pts: [P.handan, P.fukou, [113.6, 36.3], P.shangdang],
              label: { zh: '赵受上党十七城', en: 'Zhao accepts Shangdang' },
            },
          ],
          cuts: [
            { at: [113.25, 34.8], label: { zh: '上党与新郑隔绝', en: 'Shangdang cut off from Han' } },
          ],
        },
        {
          year: -261,
          date: { zh: '前261—前260年春', en: '261 – spring 260 BCE' },
          title: { zh: '王龁取上党，廉颇屯长平', en: 'Wang He takes Shangdang; Lian Po holds Changping' },
          view: [110.9, 34.85, 114.75, 36.75],
          text:
            '秦左庶长王龁自河东东进，攻取上党，上党军民东奔赵国。赵以廉颇为将，自邯郸西出滏口陉，越太行进屯长平（今山西高平），接应上党并依山筑垒，阻秦东进。',
          quote: '“秦使左庶长王龁攻韩，取上党。上党民走赵。赵军长平，以按据上党民。”',
          places: ['duanshi', 'changping'],
          arrows: [
            {
              side: 'qin',
              pts: [P.anyi, [111.8, 35.45], P.duanshi, [112.66, 35.82]],
              label: { zh: '王龁东进', en: 'Wang He advances' },
            },
            {
              side: 'zhao',
              pts: [P.handan, P.fukou, [113.5, 36.2], [113.1, 35.95], [112.97, 35.83]],
              label: { zh: '廉颇西出滏口陉', en: 'Lian Po crosses the Taihang' },
            },
          ],
          units: [
            { side: 'qin', at: [111.95, 35.22], label: { zh: '王龁', en: 'Wang He' } },
            { side: 'zhao', at: [113.45, 35.62], label: { zh: '廉颇', en: 'Lian Po' } },
          ],
        },
        {
          year: -260,
          date: { zh: '前260年 四月—七月', en: '260 BCE · Apr–Jul' },
          title: { zh: '秦夺西垒，廉颇坚壁', en: 'Qin breaks the west line; Lian Po digs in' },
          view: [112.5, 35.63, 113.12, 36.05],
          text:
            '王龁攻赵，赵军接战不利：六月秦陷赵军，取二鄣四尉；七月再攻，夺赵西垒（空仓岭一线）。廉颇退守丹河东岸，以丹河壁垒与北面百里石长城为依托，坚壁不出，秦数挑战而赵兵不应，两军相持。',
          quote: '“秦又攻其垒，取二尉，败其阵，夺西垒壁。廉颇坚壁以待秦，秦数挑战，赵兵不出。”',
          places: ['kongcang', 'changping'],
          forts: [
            { side: 'zhao', pts: FORT_KONGCANG, lost: true, face: -1, label: { zh: '赵西垒（失守）', en: 'Zhao west line (lost)' } },
            { side: 'zhao', pts: FORT_DANHE, face: -1, label: { zh: '丹河壁垒', en: 'Dan River line' } },
            { side: 'zhao', pts: FORT_BAILI, face: 1, label: { zh: '百里石长城', en: 'Baili stone wall' } },
          ],
          arrows: [
            {
              side: 'qin',
              pts: [[112.52, 35.84], [112.63, 35.83], [112.72, 35.83]],
              label: { zh: '王龁攻垒', en: 'Wang He assaults' },
            },
          ],
          clashes: [{ at: [112.735, 35.83] }],
          units: [
            { side: 'qin', at: [112.6, 35.74], label: { zh: '王龁', en: 'Wang He' } },
            { side: 'zhao', at: [113.0, 35.84], label: { zh: '廉颇', en: 'Lian Po' } },
          ],
        },
        {
          year: -260,
          date: { zh: '前260年 七月—八月', en: '260 BCE · Jul–Aug' },
          title: { zh: '反间易将，赵括出击', en: 'Zhao Kuo replaces Lian Po and attacks' },
          view: [112.5, 35.63, 113.12, 36.05],
          text:
            '赵王数责廉颇，又中秦反间（“秦之所恶，独畏马服君之子赵括为将耳”），以赵括代廉颇。秦暗中改以武安君白起为上将军，王龁为副，军中敢泄者斩。赵括一到即出丹河壁垒全线西攻，秦军佯败后撤，诱赵军追至秦壁。',
          quote: '“赵括至，则出兵击秦军。秦军详败而走，张二奇兵以劫之。”',
          places: ['changping'],
          forts: [
            { side: 'qin', pts: FORT_QINBI, face: 1, label: { zh: '秦壁', en: 'Qin ramparts' } },
            { side: 'zhao', pts: FORT_DANHE, face: -1, dim: true, label: { zh: '丹河壁垒', en: 'Dan River line' } },
            { side: 'zhao', pts: FORT_BAILI, face: 1, dim: true },
          ],
          arrows: [
            {
              side: 'zhao',
              pts: [[112.92, 35.86], [112.86, 35.84], [112.79, 35.83]],
              label: { zh: '赵括全军出击', en: 'Zhao Kuo’s offensive' },
              heavy: true,
            },
            {
              side: 'zhao',
              pts: [[112.93, 35.76], [112.87, 35.775], [112.795, 35.785]],
            },
            {
              side: 'qin',
              dashed: true,
              pts: [[112.83, 35.72], [112.79, 35.735], [112.75, 35.75]],
              label: { zh: '秦军佯败', en: 'Qin feigns retreat' },
            },
          ],
          units: [
            { side: 'qin', at: [112.66, 35.82], label: { zh: '白起', en: 'Bai Qi' } },
            { side: 'zhao', at: [112.99, 35.86], label: { zh: '赵括', en: 'Zhao Kuo' } },
          ],
        },
        {
          year: -260,
          date: { zh: '前260年 八月', en: '260 BCE · Aug' },
          title: { zh: '奇兵断后，分割合围', en: 'Flanking forces cut Zhao in two' },
          view: [112.5, 35.63, 113.12, 36.05],
          text:
            '赵军追至秦壁，秦壁坚拒不得入。白起预伏的奇兵二万五千人自北侧迂回，截断赵军后路；另一支五千骑自南插入赵军与其营垒之间。赵军被分割为二，粮道断绝，只得就地筑垒坚守，以待援军。',
          quote: '“赵军逐胜，追造秦壁。壁坚拒不得入，而秦奇兵二万五千人绝赵军后，又一军五千骑绝赵壁间，赵军分而为二，粮道绝。”',
          places: ['changping'],
          forts: [
            { side: 'qin', pts: FORT_QINBI, face: 1, label: { zh: '秦壁', en: 'Qin ramparts' } },
            { side: 'zhao', pts: FORT_DANHE, face: -1, dim: true },
          ],
          areas: [
            { side: 'zhao', center: [112.84, 35.81], rx: 0.05, ry: 0.055, label: { zh: '赵军主力被围', en: 'Zhao main army trapped' } },
          ],
          arrows: [
            {
              side: 'qin',
              pts: [[112.72, 35.97], [112.8, 35.955], [112.86, 35.92], [112.895, 35.88]],
              label: { zh: '奇兵二万五千 · 绝赵军后', en: '25,000 cut the rear' },
            },
            {
              side: 'qin',
              pts: [[112.76, 35.66], [112.83, 35.69], [112.88, 35.74], [112.9, 35.785]],
              label: { zh: '五千骑 · 绝赵壁间', en: '5,000 cavalry split the camps' },
            },
          ],
          units: [
            { side: 'qin', at: [112.66, 35.82], label: { zh: '白起', en: 'Bai Qi' } },
            { side: 'zhao', at: [112.84, 35.81], label: { zh: '赵括', en: 'Zhao Kuo' } },
          ],
        },
        {
          year: -260,
          date: { zh: '前260年 八月—九月', en: '260 BCE · Aug–Sep' },
          title: { zh: '秦王发河内，遮绝赵救', en: 'King of Qin seals off relief' },
          view: [112.2, 34.95, 113.7, 36.2],
          text:
            '秦昭襄王闻赵军粮道已绝，亲赴河内，赐民爵各一级，征发十五岁以上男子尽赴长平，自野王北上太行陉，在长平以东布防，遮断赵国援军与粮道。赵向齐求粮，齐不予，长平赵军彻底陷入孤立。',
          quote: '“秦王闻赵食道绝，王自之河内，赐民爵各一级，发年十五以上悉诣长平，遮绝赵救及粮食。”',
          places: ['changping', 'yewang'],
          forts: [
            { side: 'qin', pts: FORT_QIN_EAST, face: 1, label: { zh: '遮绝赵救', en: 'Relief blocked' } },
          ],
          areas: [
            { side: 'zhao', center: [112.84, 35.81], rx: 0.05, ry: 0.055 },
          ],
          arrows: [
            {
              side: 'qin',
              pts: [P.yewang, [112.97, 35.25], P.tianjing, [113.03, 35.6], [113.06, 35.72]],
              label: { zh: '河内征发 · 经太行陉北上', en: 'Henei levies march north' },
            },
          ],
          units: [{ side: 'qin', at: [113.2, 35.15], label: { zh: '秦昭襄王', en: 'King Zhaoxiang' } }],
        },
        {
          year: -260,
          date: { zh: '前260年 九月', en: '260 BCE · Sep' },
          title: { zh: '赵括战死，四十万降卒被坑', en: 'Zhao Kuo falls; 400,000 captives buried' },
          view: [112.5, 35.63, 113.12, 36.05],
          text:
            '赵军断粮四十六日，军中相食。赵括将全军分为四队轮番突围，四五次皆不能出，遂亲率锐卒搏战，被秦军射杀。赵卒四十万人降秦，白起以其反复难制，尽数坑杀，仅遣年幼者二百四十人归赵。前后斩首虏四十五万，赵国精壮几尽，此后再无力独抗秦国（前257年邯郸之战，赖魏、楚援军才得解围）。',
          quote: '“赵卒不得食四十六日……为四队，四五复之，不能出。其将军赵括出锐卒自搏战，秦军射杀赵括。”',
          places: ['changping'],
          forts: [{ side: 'qin', pts: FORT_QINBI, face: 1, dim: true }],
          areas: [
            { side: 'zhao', center: [112.84, 35.81], rx: 0.05, ry: 0.055, label: { zh: '断粮四十六日', en: 'Starved 46 days' }, below: true },
          ],
          arrows: [
            { side: 'zhao', pts: [[112.84, 35.83], [112.85, 35.9]], blocked: true, light: true },
            { side: 'zhao', pts: [[112.86, 35.8], [112.93, 35.815]], blocked: true, light: true },
            { side: 'zhao', pts: [[112.84, 35.79], [112.85, 35.72]], blocked: true, light: true },
            { side: 'zhao', pts: [[112.82, 35.81], [112.75, 35.82]], blocked: true, light: true },
          ],
          clashes: [{ at: [112.86, 35.915], label: { zh: '赵括中箭身亡', en: 'Zhao Kuo shot dead' } }],
        },
      ],
    },
  };

  const PLACE_NAMES = {
    guandu: { zh: '官渡', en: 'Guandu' },
    guandu_ye: { zh: '邺', en: 'Ye' },
    guandu_xu: { zh: '许县', en: 'Xu' },
    guandu_liyang: { zh: '黎阳', en: 'Liyang' },
    guandu_baima: { zh: '白马', en: 'Baima' },
    guandu_yanjin: { zh: '延津', en: 'Yanjin' },
    guandu_yangwu: { zh: '阳武', en: 'Yangwu' },
    guandu_wuchao: { zh: '乌巢', en: 'Wuchao' },
    xianyang: { zh: '咸阳', en: 'Xianyang' },
    hangu: { zh: '函谷关', en: 'Hangu Pass' },
    anyi: { zh: '安邑（河东）', en: 'Anyi (Hedong)' },
    yewang: { zh: '野王', en: 'Yewang' },
    xinzheng: { zh: '新郑（韩都）', en: 'Xinzheng (Han)' },
    handan: { zh: '邯郸（赵都）', en: 'Handan (Zhao)' },
    fukou: { zh: '滏口陉', en: 'Fukou Pass' },
    shangdang: { zh: '上党', en: 'Shangdang' },
    duanshi: { zh: '端氏', en: 'Duanshi' },
    tianjing: { zh: '太行陉', en: 'Taihang Pass' },
    changping: { zh: '长平', en: 'Changping' },
    kongcang: { zh: '空仓岭', en: 'Kongcang Ridge' },
    qinbi: { zh: '秦壁', en: 'Qin ramparts' },
    yonglu: { zh: '永录 · 尸骨坑', en: 'Yonglu burial pits' },
  };

  const SVGNS = 'http://www.w3.org/2000/svg';
  const AUTOPLAY_MS = 6000;

  // ---------------------------------------------------------------------------
  // Geometry helpers (all in SVG user units)
  // ---------------------------------------------------------------------------

  function smoothPolyline(pts, samplesPerSeg = 10) {
    if (pts.length < 3) {
      const [a, b] = pts;
      const out = [];
      for (let i = 0; i <= samplesPerSeg; i++) {
        const t = i / samplesPerSeg;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      return out;
    }
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 1; s <= samplesPerSeg; s++) {
        const t = s / samplesPerSeg;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, c, d) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }

  function cumulative(pts) {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) {
      acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    return acc;
  }

  function pointAt(pts, acc, dist) {
    const total = acc[acc.length - 1];
    const d = Math.max(0, Math.min(total, dist));
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const segLen = acc[i] - acc[i - 1] || 1;
    const t = (d - acc[i - 1]) / segLen;
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return { x: a[0] + dx * t, y: a[1] + dy * t, tx: dx / len, ty: dy / len };
  }

  function fmt(n) {
    return n.toFixed(2);
  }

  // Tapered military arrow: body widens from tail to head base, then a barbed head.
  function arrowOutline(pts, upp, opt) {
    const acc = cumulative(pts);
    const total = acc[acc.length - 1];
    const headLen = Math.min(total * 0.45, (opt.heavy ? 22 : opt.light ? 12 : 17) * upp);
    const headHalf = (opt.heavy ? 14 : opt.light ? 7 : 10.5) * upp;
    const w0 = (opt.heavy ? 3.6 : opt.light ? 1.4 : 2.4) * upp;
    const w1 = (opt.heavy ? 8 : opt.light ? 3 : 5.4) * upp;
    const bodyLen = total - headLen;
    const steps = Math.max(8, Math.ceil(bodyLen / (4 * upp)));
    const left = [];
    const right = [];
    for (let k = 0; k <= steps; k++) {
      const d = (bodyLen * k) / steps;
      const p = pointAt(pts, acc, d);
      const w = w0 + (w1 - w0) * (d / Math.max(bodyLen, 1e-6));
      left.push([p.x - p.ty * w, p.y + p.tx * w]);
      right.push([p.x + p.ty * w, p.y - p.tx * w]);
    }
    const base = pointAt(pts, acc, bodyLen);
    const tip = pointAt(pts, acc, total);
    const barbBack = headLen * 0.18;
    const hb = pointAt(pts, acc, Math.max(0, bodyLen - barbBack));
    const headL = [hb.x - base.ty * headHalf, hb.y + base.tx * headHalf];
    const headR = [hb.x + base.ty * headHalf, hb.y - base.tx * headHalf];
    let d = `M${fmt(left[0][0])} ${fmt(left[0][1])}`;
    for (let k = 1; k < left.length; k++) d += `L${fmt(left[k][0])} ${fmt(left[k][1])}`;
    d += `L${fmt(headL[0])} ${fmt(headL[1])}L${fmt(tip.x)} ${fmt(tip.y)}L${fmt(headR[0])} ${fmt(headR[1])}`;
    for (let k = right.length - 1; k >= 0; k--) d += `L${fmt(right[k][0])} ${fmt(right[k][1])}`;
    d += 'Z';
    const center = pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p[0])} ${fmt(p[1])}`).join('');
    return { d, center, total, tip, mid: pointAt(pts, acc, total * 0.5), w1 };
  }

  // ---------------------------------------------------------------------------
  // Mixin
  // ---------------------------------------------------------------------------

  class AtlasCampaignMixin {
    _campaignText(obj) {
      if (!obj) return '';
      if (typeof obj === 'string') return this.locale === 'en' ? obj : this._zh(obj);
      if (this.locale === 'en') return obj.en || obj.zh || '';
      return this._zh(obj.zh || obj.en || '');
    }

    _campaignSideColor(sideId) {
      const st = this.activeCampaign;
      const sides = (st && st.data.sides) || [];
      const i = sides.findIndex((s) => s.id === sideId);
      const s = sides[i];
      if (s && s.color) return s.color;
      const tone = (s && s.tone) || DEFAULT_SIDE_TONES[Math.max(0, i) % DEFAULT_SIDE_TONES.length];
      return SIDE_PALETTE[tone] || SIDE_PALETTE.ink;
    }

    // The side that is not `sideId` (two-sided campaigns); used for encirclement rings.
    _campaignOtherSide(sideId) {
      const sides = (this.activeCampaign && this.activeCampaign.data.sides) || [];
      const other = sides.find((s) => s.id !== sideId);
      return other ? other.id : sideId;
    }

    _campaignForMilestone(dynasty, m) {
      if (!dynasty || !m) return null;
      for (const c of Object.values(CAMPAIGNS)) {
        const mt = c.match;
        if (mt.dynastyKey === dynasty.key && mt.year === m.year && String(m.site || '').includes(mt.site)) {
          return c;
        }
      }
      return null;
    }

    startCampaign(key, phaseIdx = 0) {
      const c = CAMPAIGNS[key];
      if (!c) return false;
      if (this.challenge && typeof this.stopChallenge === 'function') this.stopChallenge(true);
      if (this.activeCustomRoute && typeof this.clearCustomRoute === 'function') this.clearCustomRoute();
      if (typeof this.closeMilestoneBalloon === 'function') this.closeMilestoneBalloon();
      if (typeof this.closeGenealogyCard === 'function') this.closeGenealogyCard();
      this.activeCampaign = { key, data: c, phase: -1 };
      this._minCameraW = 11;
      this.svg.classList.add('is-campaign-mode');
      if (this._id('viewport-frame')) this._id('viewport-frame').classList.add('has-campaign');
      this._ensureCampaignLayer();
      this._renderCampaignCard();
      const startIdx = Math.max(0, Math.min(c.phases.length - 1, phaseIdx | 0));
      // On laptop widths the chronicle pane leaves too little map beside the campaign card.
      const vf = this._id('viewport-frame');
      const needRoom =
        window.innerWidth > 900 && !this.paneCollapsed && vf && vf.getBoundingClientRect().width < 1000;
      if (needRoom && typeof this.toggleChroniclePane === 'function') {
        this._campaignCollapsedPane = true;
        this.toggleChroniclePane(true);
        setTimeout(() => {
          if (!this.activeCampaign || this.activeCampaign.key !== key) return;
          this._cameraViewportRect = null;
          this.setCampaignPhase(startIdx);
        }, 300);
      } else {
        this.setCampaignPhase(startIdx);
      }
      return true;
    }

    exitCampaign() {
      if (!this.activeCampaign) return;
      this._stopCampaignAutoplay();
      this.activeCampaign = null;
      this._minCameraW = null;
      if (this.svg) this.svg.classList.remove('is-campaign-mode', 'is-campaign-deep');
      if (this._id('viewport-frame')) this._id('viewport-frame').classList.remove('has-campaign');
      if (this.grpCampaign) this.grpCampaign.innerHTML = '';
      const card = this._id('campaign-card');
      if (card) card.remove();
      if (this._campaignCollapsedPane && typeof this.toggleChroniclePane === 'function') {
        this.toggleChroniclePane(false);
      }
      this._campaignCollapsedPane = false;
      if (this.camera && this.camera.w < 100) {
        const cx = this.camera.x + this.camera.w * 0.5;
        const cy = this.camera.y + this.camera.h * 0.5;
        const k = 100 / this.camera.w;
        this._animateCameraTo({
          x: cx - 50,
          y: cy - this.camera.h * k * 0.5,
          w: 100,
          h: this.camera.h * k,
          zoom: 10,
        });
      }
      this._scheduleUrlSync();
    }

    setCampaignPhase(idx) {
      const st = this.activeCampaign;
      if (!st) return;
      const phases = st.data.phases;
      idx = Math.max(0, Math.min(phases.length - 1, idx));
      const prevView = st.phase >= 0 ? phases[st.phase].view : null;
      st.phase = idx;
      const ph = phases[idx];
      if (this.year !== ph.year) {
        this._campaignJumping = true;
        try {
          this.jumpToYear(ph.year);
        } finally {
          this._campaignJumping = false;
        }
        if (typeof this.closeMilestoneBalloon === 'function') this.closeMilestoneBalloon();
      }
      this._updateCampaignCard();
      const sameView = prevView && prevView.join() === ph.view.join();
      if (!sameView) this._frameCampaignView(ph.view);
      this._drawCampaignPhase(true);
      this._scheduleUrlSync();
    }

    _frameCampaignView(view) {
      const [w0, s0, e0, n0] = view;
      const a = this.projector.toScreen(w0, n0);
      const b = this.projector.toScreen(e0, s0);
      const bw = b[0] - a[0];
      const bh = b[1] - a[1];
      const rect = this._getUnscaledSvgRect();
      const isMobile = window.innerWidth <= 900;
      const aspect = this._getViewportAspect();
      // Leave room for the campaign card: right column on desktop, bottom sheet on mobile.
      const card = this._id('campaign-card');
      const cardW = !isMobile && card ? card.offsetWidth + 28 : 0;
      const usableXFrac = Math.max(0.45, (rect.width - cardW) / rect.width);
      const usableYFrac = isMobile ? 0.52 : 1;
      let w = Math.max(bw / usableXFrac, bh / (aspect * usableYFrac)) * 1.12;
      w = Math.max(this._minCameraW || 11, Math.min(1300, w));
      const h = w * aspect;
      const cx = (a[0] + b[0]) * 0.5;
      const cy = (a[1] + b[1]) * 0.5;
      const x = cx - w * (usableXFrac * 0.5);
      const y = cy - h * (usableYFrac * 0.5);
      this._animateCameraTo({ x, y, w, h, zoom: 1000 / w });
    }

    _ensureCampaignLayer() {
      if (this.grpCampaign && this.grpCampaign.isConnected) return;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('id', 'grp-campaign');
      const anchor = this.grpJourney || this._id('grp-journey');
      anchor.parentNode.insertBefore(g, anchor.nextSibling);
      this.grpCampaign = g;
    }

    _campaignUnitsPerPx() {
      const rect = this._cameraViewportRect || this._getUnscaledSvgRect();
      if (!rect || !rect.width) return this.camera.w / 1000;
      return Math.max(this.camera.w / rect.width, this.camera.h / rect.height);
    }

    _drawCampaignPhase(animate = false) {
      const st = this.activeCampaign;
      if (!st || !this.grpCampaign) return;
      const ph = st.data.phases[st.phase];
      const g = this.grpCampaign;
      g.innerHTML = '';
      const upp = this._campaignUnitsPerPx();
      this._campaignDrawnW = this.camera.w;
      this.svg.classList.toggle('is-campaign-deep', this.camera.w < 60);
      const isEn = this.locale === 'en';
      const pr = (c) => this.projector.toScreen(c[0], c[1]);
      const node = (tag, attrs, parent = g) => this._svgNode(tag, attrs, parent);
      const fontPx = isEn ? 12 : 13.5;
      const labels = [];
      const col = (side) => this._campaignSideColor(side);
      const addLabel = (x, y, text, cls, anchor = 'middle', color = null) => {
        if (!text) return;
        labels.push({ x, y, text, cls, anchor, color });
      };

      // Encirclement areas
      (ph.areas || []).forEach((ar) => {
        const c = pr(ar.center);
        const e = pr([ar.center[0] + ar.rx, ar.center[1]]);
        const n = pr([ar.center[0], ar.center[1] + ar.ry]);
        const rx = Math.abs(e[0] - c[0]);
        const ry = Math.abs(n[1] - c[1]);
        node('ellipse', { cx: fmt(c[0]), cy: fmt(c[1]), rx: fmt(rx), ry: fmt(ry), class: `cmp-area side-${ar.side}` }).style.color = col(ar.side);
        node('ellipse', {
          cx: fmt(c[0]),
          cy: fmt(c[1]),
          rx: fmt(rx + 6 * upp),
          ry: fmt(ry + 6 * upp),
          class: 'cmp-ring',
        }).style.color = col(ar.by || this._campaignOtherSide(ar.side));
        if (ar.label) {
          addLabel(c[0], ar.below ? c[1] + ry + 18 * upp : c[1] - ry - 12 * upp, this._campaignText(ar.label), 'cmp-label is-area', 'middle', col(ar.side));
        }
      });

      // Fortification lines with teeth on the enemy-facing side
      (ph.forts || []).forEach((ft) => {
        const pts = smoothPolyline(ft.pts.map(pr), 8);
        const dLine = pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p[0])} ${fmt(p[1])}`).join('');
        const cls = `cmp-fort side-${ft.side}${ft.lost ? ' is-lost' : ''}${ft.dim ? ' is-dim' : ''}`;
        const fg = node('g', { class: cls });
        fg.style.color = col(ft.side);
        node('path', { d: dLine, class: 'cmp-fort-halo' }, fg);
        node('path', { d: dLine, class: 'cmp-fort-line' }, fg);
        const acc = cumulative(pts);
        const total = acc[acc.length - 1];
        const gap = 7 * upp;
        const tooth = 5 * upp;
        let teeth = '';
        for (let d = gap * 0.5; d < total; d += gap) {
          const p = pointAt(pts, acc, d);
          // face 1 = teeth on the left of the direction of travel along pts (screen y points down).
          const nx = p.ty * (ft.face || 1);
          const ny = -p.tx * (ft.face || 1);
          teeth += `M${fmt(p.x)} ${fmt(p.y)}L${fmt(p.x + nx * tooth)} ${fmt(p.y + ny * tooth)}`;
        }
        node('path', { d: teeth, class: 'cmp-fort-teeth' }, fg);
        if (ft.label) {
          const end = pts[0];
          addLabel(end[0], end[1] - 9 * upp, this._campaignText(ft.label), 'cmp-label is-fort', 'middle', col(ft.side));
        }
      });

      // Place dots
      (ph.places || []).forEach((k) => {
        const c = P[k];
        const nm = PLACE_NAMES[k];
        if (!c || !nm) return;
        const [x, y] = pr(c);
        node('circle', { cx: fmt(x), cy: fmt(y), r: fmt(3.2 * upp), class: 'cmp-place-dot' });
        addLabel(x + 6 * upp, y + 4 * upp, this._campaignText(nm), 'cmp-label is-place', 'start');
      });

      // Arrows
      const defs = node('defs', {});
      let maskSeq = 0;
      const toAnimate = [];
      (ph.arrows || []).forEach((ar) => {
        const pts = smoothPolyline(ar.pts.map(pr), 10);
        const o = arrowOutline(pts, upp, ar);
        const ag = node('g', { class: `cmp-arrow side-${ar.side}${ar.dashed ? ' is-dashed' : ''}${ar.light ? ' is-light' : ''}` });
        ag.style.color = col(ar.side);
        if (animate) {
          const id = `cmp-mask-${Date.now().toString(36)}-${maskSeq++}`;
          const mask = node('mask', { id, maskUnits: 'userSpaceOnUse', x: '-2000', y: '-2000', width: '6000', height: '6000' }, defs);
          const mp = node('path', {
            d: o.center,
            fill: 'none',
            stroke: '#fff',
            'stroke-width': fmt(40 * upp),
            'stroke-linecap': 'butt',
          }, mask);
          ag.setAttribute('mask', `url(#${id})`);
          toAnimate.push(mp);
        }
        node('path', { d: o.d, class: 'cmp-arrow-body' }, ag);
        if (ar.blocked) {
          const t = o.tip;
          const s = 5 * upp;
          node('path', {
            d: `M${fmt(t.x - s)} ${fmt(t.y - s)}L${fmt(t.x + s)} ${fmt(t.y + s)}M${fmt(t.x + s)} ${fmt(t.y - s)}L${fmt(t.x - s)} ${fmt(t.y + s)}`,
            class: 'cmp-block',
          });
        }
        if (ar.label) {
          const m = o.mid;
          const off = (o.w1 + 11) * upp;
          // Put the label on the outer side of the bend, preferring above.
          let nx = -m.ty;
          let ny = m.tx;
          if (ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const lx = m.x + nx * off;
          const ly = m.y + ny * off;
          const anchor = Math.abs(nx) > 0.55 ? (nx > 0 ? 'start' : 'end') : 'middle';
          // The ink side keeps the default ink label; other sides tint the label with their colour.
          const sideIdx = st.data.sides.findIndex((sd) => sd.id === ar.side);
          addLabel(lx, ly, this._campaignText(ar.label), 'cmp-label is-arrow', anchor, sideIdx > 0 ? col(ar.side) : null);
        }
      });

      // Cut marks (lines of communication severed)
      (ph.cuts || []).forEach((ct) => {
        const [x, y] = pr(ct.at);
        const s = 6 * upp;
        node('path', {
          d: `M${fmt(x - s)} ${fmt(y - s * 0.4)}L${fmt(x + s)} ${fmt(y + s * 0.4)}M${fmt(x - s)} ${fmt(y + s * 0.6)}L${fmt(x + s)} ${fmt(y + s * 1.4)}`,
          class: 'cmp-cut',
        });
        addLabel(x, y + 18 * upp, this._campaignText(ct.label), 'cmp-label is-note');
      });

      // Clash sites
      (ph.clashes || []).forEach((cl) => {
        const [x, y] = pr(cl.at);
        const cg = node('g', { class: 'cmp-clash', transform: `translate(${fmt(x)},${fmt(y)}) scale(${(upp).toFixed(4)})` });
        node('circle', { r: '9.5', class: 'cmp-clash-bg' }, cg);
        node('path', { d: 'M-5 -5L5 5M5 -5L-5 5', class: 'cmp-clash-x' }, cg);
        if (cl.label) addLabel(x + 13 * upp, y + 4 * upp, this._campaignText(cl.label), 'cmp-label is-clash', 'start');
      });

      // Commander flags
      (ph.units || []).forEach((u) => {
        const [x, y] = pr(u.at);
        const txt = this._campaignText(u.label);
        const tw = Math.max(26, txt.length * (isEn ? 6.4 : 12) + 14);
        const ug = node('g', { class: `cmp-unit side-${u.side}`, transform: `translate(${fmt(x)},${fmt(y)}) scale(${upp.toFixed(4)})` });
        ug.style.color = col(u.side);
        node('rect', { x: fmt(-tw / 2), y: '-10', width: fmt(tw), height: '20', rx: '3', class: 'cmp-unit-box' }, ug);
        const t = node('text', { x: '0', y: '0.5', class: 'cmp-unit-text' }, ug);
        t.textContent = txt;
      });

      // Labels last so they sit above everything
      labels.forEach((lb) => {
        const t = node('text', {
          x: fmt(lb.x),
          y: fmt(lb.y),
          class: lb.cls,
          'text-anchor': lb.anchor,
          'font-size': fmt(fontPx * upp),
        });
        t.style.strokeWidth = `${(3.2 * upp).toFixed(3)}px`;
        if (lb.color) t.style.fill = lb.color;
        t.textContent = lb.text;
      });

      if (this.locale === 'zh-tw' && typeof this._applyZhHantDom === 'function') this._applyZhHantDom(g);

      if (animate && toAnimate.length) {
        const lens = toAnimate.map((p) => p.getTotalLength());
        toAnimate.forEach((p, i) => {
          p.setAttribute('stroke-dasharray', `${lens[i]} ${lens[i]}`);
          p.setAttribute('stroke-dashoffset', String(lens[i]));
        });
        const t0 = performance.now();
        const dur = 1100;
        const stagger = 280;
        const step = (now) => {
          if (!toAnimate[0].isConnected) return;
          let done = true;
          toAnimate.forEach((p, i) => {
            const k = Math.max(0, Math.min(1, (now - t0 - i * stagger) / dur));
            if (k < 1) done = false;
            const ease = 1 - Math.pow(1 - k, 2.4);
            p.setAttribute('stroke-dashoffset', String(lens[i] * (1 - ease)));
          });
          if (!done) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }

    _renderCampaignCard() {
      const st = this.activeCampaign;
      if (!st) return;
      const c = st.data;
      const isEn = this.locale === 'en';
      let card = this._id('campaign-card');
      if (!card) {
        card = document.createElement('section');
        card.id = 'campaign-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', this._campaignText({ zh: '战役推演', en: 'Campaign playback' }));
        (this._id('viewport-frame') || document.body).appendChild(card);
      }
      const esc = HistoricalAtlasController._escHtml || ((s) => String(s));
      const sides = c.sides
        .map(
          (s) =>
            `<div class="cmp-side side-${s.id}"><span class="cmp-swatch" style="background:${this._campaignSideColor(s.id)}"></span><b>${esc(this._campaignText(s))}</b><span>${esc(this._campaignText(s.lead))}</span></div>`
        )
        .join('');
      const dots = c.phases
        .map(
          (ph, i) =>
            `<button type="button" class="cmp-dot" data-idx="${i}" title="${esc(this._campaignText(ph.date))} · ${esc(this._campaignText(ph.title))}">${i + 1}</button>`
        )
        .join('');
      card.innerHTML =
        `<header class="cmp-head"><span class="cmp-tag">${isEn ? 'Campaign' : '战役推演'}</span>` +
        `<h3 class="cmp-title">${esc(this._campaignText(c))}</h3>` +
        `<button type="button" class="cmp-close" aria-label="${isEn ? 'Close' : '关闭'}" title="${isEn ? 'Close (Esc)' : '关闭（Esc）'}">×</button></header>` +
        `<div class="cmp-span">${esc(this._campaignText(c.span))}</div>` +
        `<div class="cmp-sides">${sides}</div>` +
        `<nav class="cmp-steps">${dots}</nav>` +
        `<div class="cmp-body"><div class="cmp-date"></div><h4 class="cmp-ph-title"></h4><p class="cmp-text"></p><blockquote class="cmp-quote"></blockquote></div>` +
        `<div class="cmp-ctrl"><button type="button" class="cmp-prev">‹ ${isEn ? 'Prev' : '上一步'}</button>` +
        `<button type="button" class="cmp-play">${isEn ? '▶ Play' : '▶ 自动播放'}</button>` +
        `<button type="button" class="cmp-next">${isEn ? 'Next' : '下一步'} ›</button></div>` +
        `<div class="cmp-legend"><span><i class="lg-arrow"></i>${isEn ? 'Advance' : '进军'}</span><span><i class="lg-fort"></i>${isEn ? 'Fortified line' : '壁垒防线'}</span><span><i class="lg-ring"></i>${isEn ? 'Encircled' : '被围'}</span><span><i class="lg-clash"></i>${isEn ? 'Clash' : '交战'}</span></div>` +
        `<footer class="cmp-src">${esc(this._campaignText(c.source))}</footer>`;
      card.querySelector('.cmp-close').addEventListener('click', () => this.exitCampaign());
      card.querySelector('.cmp-prev').addEventListener('click', () => {
        this._stopCampaignAutoplay();
        this.setCampaignPhase(this.activeCampaign.phase - 1);
      });
      card.querySelector('.cmp-next').addEventListener('click', () => {
        this._stopCampaignAutoplay();
        this.setCampaignPhase(this.activeCampaign.phase + 1);
      });
      card.querySelector('.cmp-play').addEventListener('click', () => this._toggleCampaignAutoplay());
      card.querySelectorAll('.cmp-dot').forEach((b) =>
        b.addEventListener('click', () => {
          this._stopCampaignAutoplay();
          this.setCampaignPhase(Number(b.dataset.idx));
        })
      );
      ['pointerdown', 'wheel', 'dblclick'].forEach((t) =>
        card.addEventListener(t, (e) => e.stopPropagation(), { passive: true })
      );
      if (this.locale === 'zh-tw' && typeof this._applyZhHantDom === 'function') this._applyZhHantDom(card);
    }

    _updateCampaignCard() {
      const st = this.activeCampaign;
      const card = this._id('campaign-card');
      if (!st || !card) return;
      const ph = st.data.phases[st.phase];
      const n = st.data.phases.length;
      card.querySelector('.cmp-date').textContent = `${st.phase + 1} / ${n} · ${this._campaignText(ph.date)}`;
      card.querySelector('.cmp-ph-title').textContent = this._campaignText(ph.title);
      card.querySelector('.cmp-text').textContent = this._campaignText(ph.text);
      const q = card.querySelector('.cmp-quote');
      q.textContent = this.locale === 'en' ? '' : this._zh(ph.quote || '');
      q.hidden = !q.textContent;
      card.querySelectorAll('.cmp-dot').forEach((b, i) => {
        b.classList.toggle('is-active', i === st.phase);
        b.classList.toggle('is-done', i < st.phase);
      });
      card.querySelector('.cmp-prev').disabled = st.phase === 0;
      card.querySelector('.cmp-next').disabled = st.phase === n - 1;
    }

    _toggleCampaignAutoplay() {
      if (this._campaignTimer) {
        this._stopCampaignAutoplay();
        return;
      }
      const st = this.activeCampaign;
      if (!st) return;
      // Act at once so the click is visibly answered, then keep stepping on a timer.
      const last = st.data.phases.length - 1;
      this._campaignTimer = true;
      this.setCampaignPhase(st.phase >= last ? 0 : st.phase + 1);
      this._scheduleCampaignStep();
    }

    _scheduleCampaignStep() {
      if (this._campaignStepTimeout) clearTimeout(this._campaignStepTimeout);
      const st = this.activeCampaign;
      if (!st || !this._campaignTimer || st.phase >= st.data.phases.length - 1) {
        this._stopCampaignAutoplay();
        return;
      }
      this._campaignTimer = true;
      this._syncCampaignPlayBtn(true);
      this._campaignStepTimeout = setTimeout(() => {
        const cur = this.activeCampaign;
        if (!cur || !this._campaignTimer) return;
        this.setCampaignPhase(cur.phase + 1);
        this._scheduleCampaignStep();
      }, AUTOPLAY_MS);
    }

    _stopCampaignAutoplay() {
      if (this._campaignStepTimeout) clearTimeout(this._campaignStepTimeout);
      this._campaignStepTimeout = null;
      this._campaignTimer = null;
      this._syncCampaignPlayBtn();
    }

    _syncCampaignPlayBtn(restartProgress = false) {
      const card = this._id('campaign-card');
      if (!card) return;
      const btn = card.querySelector('.cmp-play');
      const isEn = this.locale === 'en';
      const playing = Boolean(this._campaignTimer);
      const label = playing ? (isEn ? '❚❚ Pause' : '❚❚ 暂停') : isEn ? '▶ Play' : '▶ 自动播放';
      btn.innerHTML = `<span>${label}</span><i class="cmp-play-bar"></i>`;
      btn.classList.toggle('is-playing', playing);
      const bar = btn.querySelector('.cmp-play-bar');
      if (playing && restartProgress) {
        bar.style.animationDuration = `${AUTOPLAY_MS}ms`;
        bar.classList.add('is-running');
      }
      const next = card.querySelector('.cmp-next');
      if (next && this.activeCampaign) {
        next.disabled = this.activeCampaign.phase >= this.activeCampaign.data.phases.length - 1;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Install: mixin + light wrappers around existing controller hooks
  // ---------------------------------------------------------------------------

  let HistoricalAtlasController = null;

  function wrap(proto, name, after) {
    const orig = proto[name];
    if (typeof orig !== 'function') return;
    proto[name] = function (...args) {
      const ret = orig.apply(this, args);
      try {
        after.call(this, ret, args);
      } catch (err) {
        if (typeof console !== 'undefined') console.warn('[campaign]', name, err);
      }
      return ret;
    };
  }

  function install(Ctrl) {
    HistoricalAtlasController = Ctrl;
    Ctrl._extendPrototype(AtlasCampaignMixin);
    Ctrl.CAMPAIGNS = CAMPAIGNS;
    const proto = Ctrl.prototype;

    // Redraw with pixel-constant sizes after every zoom settle.
    wrap(proto, '_rescaleSvgTypography', function () {
      if (!this.activeCampaign || !this.grpCampaign) return;
      if (this._campaignDrawnW !== undefined && Math.abs(this._campaignDrawnW - this.camera.w) < 0.01) return;
      this._drawCampaignPhase(false);
    });

    // Leaving the campaign's years ends playback.
    wrap(proto, 'jumpToYear', function () {
      if (!this.activeCampaign || this._campaignJumping) return;
      const [a, b] = this.activeCampaign.data.yearRange;
      if (this.year < a || this.year > b) this.exitCampaign();
    });

    // Entry button on the matching event callout.
    wrap(proto, 'openMilestoneBalloon', function (_ret, args) {
      const [dynasty, m] = args;
      const c = this._campaignForMilestone(dynasty, m);
      const balloon = this.milestoneBalloon;
      if (!c || !balloon || balloon.classList.contains('is-hidden')) return;
      const head = balloon.querySelector('.ep-head');
      if (!head || head.querySelector('.ep-campaign')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ep-campaign';
      btn.title = this.locale === 'en' ? 'Play the campaign: both armies’ routes and phases' : '战役推演：双方进军路线与交战过程';
      btn.textContent = this.locale === 'en' ? '⚔ Campaign ›' : '⚔ 战役推演 ›';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startCampaign(c.key);
      });
      head.insertBefore(btn, head.querySelector('.ep-close'));
      if (this.locale === 'zh-tw' && typeof this._applyZhHantDom === 'function') this._applyZhHantDom(btn);
      if (typeof this._measureMilestoneBalloonSize === 'function') this._measureMilestoneBalloonSize();
      if (typeof this._positionMilestoneBalloon === 'function') this._positionMilestoneBalloon();
    });

    // Shareable state: ?campaign=changping&cphase=3
    wrap(proto, '_urlStateParams', function (params) {
      if (!params || typeof params.set !== 'function') return;
      if (this.activeCampaign) {
        params.set('campaign', this.activeCampaign.key);
        params.set('cphase', String(this.activeCampaign.phase + 1));
      }
    });
  }

  if (typeof window === 'undefined') return;
  const readyCtrl = window.HistoricalAtlasController;
  if (readyCtrl && typeof readyCtrl._extendPrototype === 'function') {
    install(readyCtrl);
  } else {
    (window.__ATLAS_MIXINS = window.__ATLAS_MIXINS || []).push(install);
  }

  // Deep link boot + Esc to close
  window.addEventListener('DOMContentLoaded', () => {
    const q = new URLSearchParams(location.search);
    const key = q.get('campaign');
    if (key && CAMPAIGNS[key]) {
      const phase = Math.max(0, (Number(q.get('cphase')) || 1) - 1);
      let tries = 0;
      const boot = () => {
        const app = window.atlasApp;
        if (app && app.lastRenderedSnap && app.projector) {
          // Let the initial layout and intro camera settle before measuring the viewport.
          setTimeout(() => app.startCampaign(key, phase), 700);
        } else if (tries++ < 600) {
          // Background tabs throttle timers, so keep waiting (up to ~60 s of ticks).
          setTimeout(boot, 100);
        }
      };
      setTimeout(boot, 0);
    }
    window.addEventListener('keydown', (e) => {
      const app = window.atlasApp;
      if (!app || !app.activeCampaign) return;
      if (e.key === 'Escape') app.exitCampaign();
    });
  });
})();

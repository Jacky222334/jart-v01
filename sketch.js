import { updateVertexShader }              from './updateVertex.js';
import { physarumUpdateFragmentShader }    from './updateFragmentPhysarum.js';
import { drawVertexShader }                from './drawVertex.js';
import { trailDecayFragmentShader }        from './trailDecayFragment.js';
import { trailDisplayFragmentShader }      from './trailDisplayFragment.js';
import { depositFragmentShader }           from './depositFragment.js';
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default class PhysarumApp {
  constructor(canvas, seed = 48) {
    this.canvas = canvas;
    this.seed = seed;
    this.random = mulberry32(seed);
    this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    if (!this.gl) throw new Error('WebGL not supported');
    this.toggleAvoiderDisplay = false;
    this.SIZE = 1000;
    this.index = seed % 64;
    this.bloom = 1.15;
    this.PHYS = [{sensorAngle:95,sensorDist:.02,stepSize:.002,turnSpeed:.8,wrap:1,decay:.51,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:.001,explore:.2,avoidanceStrength:0,startX:.25,startY:.25,pixelation:4,mandalaRings:2,mandalaPointsPerRing:10,mandalaRadius:.2,mandalaRotationSpeed:.1,avoiderStrength:3.35,avoiderRadius:.15,redOrGreen:0},{sensorAngle:95,sensorDist:-.005,stepSize:.003,turnSpeed:.5,wrap:1,decay:.51,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:.06,explore:.4,avoidanceStrength:.5,startX:.3,startY:.3,pixelation:4,mandalaRings:4,mandalaPointsPerRing:4,mandalaRadius:.3,mandalaRotationSpeed:0,avoiderStrength:4.2,avoiderRadius:.25,redOrGreen:0},{sensorAngle:5,sensorDist:.05,stepSize:.002,turnSpeed:.9,wrap:1,decay:.41,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:.01,explore:1.5,avoidanceStrength:.5,startX:.5,startY:.5,pixelation:4,mandalaRings:10,mandalaPointsPerRing:4,mandalaRadius:.1,mandalaRotationSpeed:.2,avoiderStrength:4,avoiderRadius:.63,redOrGreen:0},{sensorAngle:5,sensorDist:.01,stepSize:.002,turnSpeed:.5,wrap:1,decay:.41,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:2.4,explore:1.5,avoidanceStrength:.5,startX:.4,startY:.4,pixelation:4,mandalaRings:6,mandalaPointsPerRing:8,mandalaRadius:.3,mandalaRotationSpeed:.2,avoiderStrength:4.1,avoiderRadius:.05,redOrGreen:0},{sensorAngle:5,sensorDist:.01,stepSize:.002,turnSpeed:.9,wrap:1,decay:.41,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:.01,explore:.5,avoidanceStrength:1.5,startX:.3,startY:.3,pixelation:4,mandalaRings:6,mandalaPointsPerRing:6,mandalaRadius:.25,mandalaRotationSpeed:0,avoiderStrength:10.5,avoiderRadius:.14,redOrGreen:0},{sensorAngle:5,sensorDist:.01,stepSize:.0015,turnSpeed:.8,wrap:1,decay:.41,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.002,color:Math.floor(3*Math.random()),flowStrength:.01,explore:.9,avoidanceStrength:1.5,startX:.3,startY:.3,pixelation:4,mandalaRings:3,mandalaPointsPerRing:6,mandalaRadius:.15,mandalaRotationSpeed:0,avoiderStrength:-.3,avoiderRadius:.1,redOrGreen:1},{sensorAngle:95,sensorDist:.05,stepSize:.002,turnSpeed:.3,wrap:1,decay:.41,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:.01,explore:.9,avoidanceStrength:1.5,startX:.4,startY:.2,pixelation:4,mandalaRings:4,mandalaPointsPerRing:10,mandalaRadius:.35,mandalaRotationSpeed:0,avoiderStrength:-4.8,avoiderRadius:.1,redOrGreen:1},{sensorAngle:95,sensorDist:-.2,stepSize:.004,turnSpeed:.8,wrap:1,decay:.51,deposit:10.91,displayIntensity:1,displayGamma:1,aberration:.001,color:Math.floor(3*Math.random()),flowStrength:.06,explore:.4,avoidanceStrength:.5,startX:.1,startY:.1,pixelation:4,mandalaRings:4,mandalaPointsPerRing:6,mandalaRadius:.3,mandalaRotationSpeed:0,avoiderStrength:-4,avoiderRadius:.25,redOrGreen:0},{sensorAngle:95,sensorDist:.06740652943906564,stepSize:.003,turnSpeed:.43528798135302105,wrap:1,decay:.37389814642207575,deposit:.1296353795055671,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.5008364114074566,explore:.584398598200099,avoidanceStrength:.02235166639722369,startX:.34882842825061183,startY:.248042209294088,pixelation:4,mandalaRings:9,mandalaPointsPerRing:2,mandalaRadius:.6443150457340807,mandalaRotationSpeed:0,avoiderStrength:-4.133922720040938,avoiderRadius:.36555085575505175,redOrGreen:1},{sensorAngle:95,sensorDist:.04752109601738227,stepSize:.003,turnSpeed:.2188279863170213,wrap:1,decay:.5825854932105072,deposit:.4175848602727249,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.22161308467559884,explore:.8161877481791892,avoidanceStrength:.38008064070603237,startX:.3623536520878565,startY:.3744746600583228,pixelation:4,mandalaRings:5,mandalaPointsPerRing:9,mandalaRadius:.8755512082593729,mandalaRotationSpeed:0,avoiderStrength:-3.7357965047453168,avoiderRadius:.3486351503556409,redOrGreen:1},{sensorAngle:95,sensorDist:.06254999462083129,stepSize:.003,turnSpeed:.1644656298519981,wrap:1,decay:.10383157071597325,deposit:.6353342241353228,displayIntensity:1,displayGamma:1,aberration:.002,color:0,flowStrength:.47515861974079765,explore:.608030212178648,avoidanceStrength:.38134349225531605,startX:.34237068249254565,startY:.23406790745294392,pixelation:4,mandalaRings:4,mandalaPointsPerRing:1,mandalaRadius:.9276489749562903,mandalaRotationSpeed:0,avoiderStrength:3.874973056860597,avoiderRadius:.47413352117204144,redOrGreen:1},{sensorAngle:95,sensorDist:.0260352779279288,stepSize:.003,turnSpeed:.1114676699669114,wrap:1,decay:.289408796097159,deposit:.8121518375256133,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.082265957882365,explore:.3855876046747614,avoidanceStrength:.4520764836011698,startX:.1352322439691972,startY:.3698393016435616,pixelation:4,mandalaRings:9,mandalaPointsPerRing:4,mandalaRadius:.14828365791503184,mandalaRotationSpeed:0,avoiderStrength:3.293972118777811,avoiderRadius:.7447440965144876,redOrGreen:1},{sensorAngle:95,sensorDist:.08528774478713957,stepSize:.003,turnSpeed:.11892813336961647,wrap:1,decay:.12257391151030053,deposit:.5679811370380962,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.10122304492477628,explore:.3943721720434058,avoidanceStrength:.4416838605458821,startX:.05579483718616046,startY:.42825739246715416,pixelation:4,mandalaRings:1,mandalaPointsPerRing:8,mandalaRadius:.636771893926818,mandalaRotationSpeed:0,avoiderStrength:-4.546747344238355,avoiderRadius:.15233385809865757,redOrGreen:0},{sensorAngle:95,sensorDist:.03201416197708028,stepSize:.003,turnSpeed:.4697462691269185,wrap:1,decay:.34409084205396856,deposit:.5888155440668931,displayIntensity:1,displayGamma:1,aberration:.002,color:0,flowStrength:.091320895577836,explore:.3784102368727167,avoidanceStrength:-.16868759104461195,startX:.3560866977605638,startY:.06099772742410081,pixelation:4,mandalaRings:6,mandalaPointsPerRing:2,mandalaRadius:.5951485375158361,mandalaRotationSpeed:0,avoiderStrength:-4.018050325631077,avoiderRadius:.9196807016433997,redOrGreen:1},{sensorAngle:95,sensorDist:.07734346764199412,stepSize:.005,turnSpeed:.28038749780128747,wrap:1,decay:-.331412448406003,deposit:.940329342197528,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:.10679627924791617,explore:.10060311761418644,avoidanceStrength:.31022000256486926,startX:.48695918871346994,startY:.016383868472913288,pixelation:4,mandalaRings:2,mandalaPointsPerRing:5,mandalaRadius:.4239737419112988,mandalaRotationSpeed:0,avoiderStrength:-3.3556624351877646,avoiderRadius:.30302168184765543,redOrGreen:1},{sensorAngle:95,sensorDist:.04396912645292605,stepSize:.003,turnSpeed:.38502428667425637,wrap:1,decay:.45081937729866495,deposit:.8158538568500002,displayIntensity:1,displayGamma:1,aberration:.002,color:2,flowStrength:.206141307438684,explore:.47087704153484433,avoidanceStrength:-.3942617245808866,startX:.013349136145483831,startY:.3353794980307254,pixelation:4,mandalaRings:6,mandalaPointsPerRing:6,mandalaRadius:.5702451343417058,mandalaRotationSpeed:0,avoiderStrength:3.9544757223709013,avoiderRadius:.7041638037211386,redOrGreen:1},{sensorAngle:95,sensorDist:.015238054108347367,stepSize:.003,turnSpeed:.2325555951965917,wrap:1,decay:.4906501377286907,deposit:.9416979336039207,displayIntensity:1,displayGamma:1,aberration:.002,color:0,flowStrength:.490568843974785,explore:.7586955838635009,avoidanceStrength:-.20286612309095442,startX:.4555945882818332,startY:.48784629595428014,pixelation:4,mandalaRings:1,mandalaPointsPerRing:4,mandalaRadius:.7928273381374382,mandalaRotationSpeed:0,avoiderStrength:-3.921374721380413,avoiderRadius:.1777956090917815,redOrGreen:1},{sensorAngle:5,sensorDist:.06923775476834125,stepSize:.003,turnSpeed:.3388181042926708,wrap:1,decay:.41563640261904755,deposit:.66941412291351,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:.10678446699337994,explore:.43242853666226555,avoidanceStrength:-.19424262144630933,startX:.22322829893704932,startY:.20844188146383652,pixelation:4,mandalaRings:4,mandalaPointsPerRing:5,mandalaRadius:.4334420743109364,mandalaRotationSpeed:0,avoiderStrength:2.8982915744037214,avoiderRadius:.17952636851725093,redOrGreen:0},{sensorAngle:104,sensorDist:.07178717986836491,stepSize:.003,turnSpeed:.14639349067143229,wrap:1,decay:.2681539417738925,deposit:.7591764826557377,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:.3913462377566196,explore:.7149469334804834,avoidanceStrength:-.2749065942701988,startX:.14166110125869563,startY:.15623898496770844,pixelation:4,mandalaRings:1,mandalaPointsPerRing:9,mandalaRadius:.49403999056254455,mandalaRotationSpeed:0,avoiderStrength:3.5565384731550154,avoiderRadius:.6719252669761134,redOrGreen:0},{sensorAngle:13,sensorDist:.09217036131777988,stepSize:.003,turnSpeed:.31354866935287384,wrap:1,decay:.36845613235638763,deposit:.8481226669012458,displayIntensity:1,displayGamma:1,aberration:.002,color:0,flowStrength:.3277778395359074,explore:.9095061284817232,avoidanceStrength:-.11520533601587069,startX:.3838884758982962,startY:.03930099140099991,pixelation:4,mandalaRings:7,mandalaPointsPerRing:8,mandalaRadius:.9062014626854719,mandalaRotationSpeed:0,avoiderStrength:3.82434911938266,avoiderRadius:.2479890024777338,redOrGreen:1},{sensorAngle:95,sensorDist:.01472736291928459,stepSize:.003,turnSpeed:.2902628158017121,wrap:1,decay:.5178921284643947,deposit:.9052212747640391,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.49571914325446637,explore:.3542894121005368,avoidanceStrength:.0356166205966153,startX:.17241077674011765,startY:.07821132794288127,pixelation:4,mandalaRings:9,mandalaPointsPerRing:4,mandalaRadius:.9490558917015313,mandalaRotationSpeed:0,avoiderStrength:-3.964237080910886,avoiderRadius:.8450310422419778,redOrGreen:1},{sensorAngle:5,sensorDist:.02399844156570952,stepSize:.003,turnSpeed:.3666688632635863,wrap:1,decay:.5003851647029266,deposit:.7754443907139329,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:.25109018329589644,explore:.9471670100368395,avoidanceStrength:.21231182473125465,startX:.11229304605722434,startY:.27593978148073256,pixelation:4,mandalaRings:9,mandalaPointsPerRing:9,mandalaRadius:.42250054659710035,mandalaRotationSpeed:0,avoiderStrength:3.157032448879253,avoiderRadius:.14428531475374684,redOrGreen:0},{sensorAngle:21,sensorDist:.024557359655675137,stepSize:.003,turnSpeed:.2910619731598083,wrap:1,decay:.26141789812177835,deposit:.8733902763180119,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.3759389900694314,explore:.45536194595086166,avoidanceStrength:.27757527664778003,startX:.15981419773066347,startY:.4003220733654686,pixelation:4,mandalaRings:3,mandalaPointsPerRing:4,mandalaRadius:.7478048942400334,mandalaRotationSpeed:0,avoiderStrength:3.814279752028092,avoiderRadius:.6435960333203324,redOrGreen:1},{sensorAngle:88,sensorDist:.016403192766253502,stepSize:.003,turnSpeed:.18781096954898932,wrap:1,decay:.16152820145882238,deposit:.5249021205110176,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.22089142781257856,explore:.7780440290479089,avoidanceStrength:.30438851500842734,startX:.39054148373493075,startY:.439044571483481,pixelation:4,mandalaRings:9,mandalaPointsPerRing:4,mandalaRadius:.5842527504883996,mandalaRotationSpeed:.5,avoiderStrength:-3.942815605005249,avoiderRadius:.4591167789671917,redOrGreen:1},{sensorAngle:14,sensorDist:-.07634748162315497,stepSize:.003,turnSpeed:.33273568348962823,wrap:1,decay:.1547106396697256,deposit:.23493320831104603,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.2952857521062967,explore:.49536538210531145,avoidanceStrength:.13788297939768013,startX:.23579002515656894,startY:.19647786194736339,pixelation:4,mandalaRings:5,mandalaPointsPerRing:7,mandalaRadius:.722221205299541,mandalaRotationSpeed:0,avoiderStrength:-6.39088507596958,avoiderRadius:.3596876238248099,redOrGreen:1},{sensorAngle:134,sensorDist:-.07053636147426151,stepSize:.001,turnSpeed:.32192333015265073,wrap:1,decay:.17121617952848514,deposit:.5841251062047186,displayIntensity:1,displayGamma:1,aberration:.002,color:2,flowStrength:.1774166038110402,explore:.6036140806949667,avoidanceStrength:.1613135393674417,startX:.42475281767617895,startY:.11851042018161073,pixelation:4,mandalaRings:6,mandalaPointsPerRing:6,mandalaRadius:.36361990246632603,mandalaRotationSpeed:0,avoiderStrength:-7.079190708249569,avoiderRadius:.13840390616974263,redOrGreen:1},{sensorAngle:10,sensorDist:.01003960826843744,stepSize:.003,turnSpeed:.11679464458385384,wrap:1,decay:-.023277980427619388,deposit:.6077238898425789,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.37996285873614283,explore:.0209231686019251,avoidanceStrength:-.008939341297862669,startX:.4635156426343971,startY:.4287692623799083,pixelation:4,mandalaRings:2,mandalaPointsPerRing:8,mandalaRadius:.15504545187430738,mandalaRotationSpeed:0,avoiderStrength:-3.713049163203515,avoiderRadius:.23673106408794473,redOrGreen:0},{sensorAngle:73,sensorDist:.06699670914359977,stepSize:.003,turnSpeed:.2758493234938517,wrap:1,decay:-.3982629087991053,deposit:.8469392564430849,displayIntensity:1,displayGamma:1,aberration:.002,color:2,flowStrength:.08136162215424901,explore:.906582278419148,avoidanceStrength:.08266280803755388,startX:.1421802447763097,startY:.1321369332377419,pixelation:4,mandalaRings:2,mandalaPointsPerRing:3,mandalaRadius:.7756382279342685,mandalaRotationSpeed:0,avoiderStrength:-3.6930421551242576,avoiderRadius:.7041792235756883,redOrGreen:1},{sensorAngle:77,sensorDist:.08504345683058749,stepSize:.003,turnSpeed:.9813894304940796,wrap:1,decay:-.5122337936544082,deposit:.776087910076613,displayIntensity:1,displayGamma:1,aberration:.002,color:2,flowStrength:.4213107256421561,explore:.2794370331999358,avoidanceStrength:.15534706142343174,startX:.4029010690169483,startY:.2877191615563299,pixelation:4,mandalaRings:5,mandalaPointsPerRing:2,mandalaRadius:.7224162868090694,mandalaRotationSpeed:0,avoiderStrength:-3.676441326992343,avoiderRadius:.9920453975241396,redOrGreen:1},{sensorAngle:73,sensorDist:.03952000469938351,stepSize:.003,turnSpeed:.39179441356780986,wrap:1,decay:.006871120003760028,deposit:.5526160579868956,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.49550706551056756,explore:.8279957287601148,avoidanceStrength:-.04256634917164748,startX:.3981161643566672,startY:.043091059787643715,pixelation:4,mandalaRings:1,mandalaPointsPerRing:1,mandalaRadius:.513882038039599,mandalaRotationSpeed:0,avoiderStrength:3.537902230869703,avoiderRadius:.6051534794799938,redOrGreen:1},{sensorAngle:73,sensorDist:.06387152257892385,stepSize:.003,turnSpeed:.36917242268528905,wrap:1,decay:-.4538431611965562,deposit:.4688381685135977,displayIntensity:1,displayGamma:1,aberration:.002,color:0,flowStrength:.3451028275606993,explore:.8868098185648817,avoidanceStrength:-.29934380523567483,startX:.39332603795613624,startY:.33171734788739093,pixelation:4,mandalaRings:8,mandalaPointsPerRing:6,mandalaRadius:.8976367903510503,mandalaRotationSpeed:0,avoiderStrength:8.793400245291844,avoiderRadius:.2998317908327732,redOrGreen:1},{sensorAngle:129,sensorDist:.1012015004345353,stepSize:.003,turnSpeed:.19319935171337374,wrap:1,decay:-.27103283069445083,deposit:.8658939524734277,displayIntensity:1,displayGamma:1,aberration:.002,color:2,flowStrength:.047332921262218094,explore:.41275159159025077,avoidanceStrength:-.3024559723029585,startX:.2166290833880693,startY:.422473780978191,pixelation:4,mandalaRings:4,mandalaPointsPerRing:3,mandalaRadius:.5317187397109919,mandalaRotationSpeed:0,avoiderStrength:7.063988894035026,avoiderRadius:.10396681400692258,redOrGreen:1},{sensorAngle:27,sensorDist:-.00021200175253246935,stepSize:.003,turnSpeed:.27940172981577993,wrap:1,decay:-.4559587918106143,deposit:.7023372737831882,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.40925537710210746,explore:.3359441403067225,avoidanceStrength:.4599251772080055,startX:.2537844651717456,startY:.23656246544040826,pixelation:4,mandalaRings:3,mandalaPointsPerRing:7,mandalaRadius:.5436426863853575,mandalaRotationSpeed:0,avoiderStrength:-4.012891030223004,avoiderRadius:.2638996250001494,redOrGreen:1},{sensorAngle:152,sensorDist:-.08692368366597505,stepSize:.003,turnSpeed:.577370447570238,wrap:1,decay:-.31090436636071195,deposit:.43404717044513763,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.2420811484659621,explore:.6703898145387738,avoidanceStrength:-.3027512900226723,startX:.23057939480426004,startY:.19815523714546301,pixelation:4,mandalaRings:6,mandalaPointsPerRing:2,mandalaRadius:.9659221134993142,mandalaRotationSpeed:0,avoiderStrength:-4.038601846881477,avoiderRadius:.5847871769196773,redOrGreen:1},{sensorAngle:1,sensorDist:-.05460781488673944,stepSize:.003,turnSpeed:.19945871374002758,wrap:1,decay:-.4571185054771645,deposit:.11071075598195153,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.5043306888541421,explore:.5140988851681272,avoidanceStrength:-.2770385143598363,startX:.03248080896568112,startY:.1099893077072222,pixelation:4,mandalaRings:4,mandalaPointsPerRing:6,mandalaRadius:.9373956042379099,mandalaRotationSpeed:0,avoiderStrength:2.214780358698741,avoiderRadius:.2260114549542322,redOrGreen:1},{sensorAngle:166,sensorDist:-.034501739882135875,stepSize:.003,turnSpeed:.15219708607971696,wrap:1,decay:.020180376285198337,deposit:.6781833662570126,displayIntensity:1,displayGamma:1,aberration:.002,color:0,flowStrength:.2490641769487468,explore:.15287114968662674,avoidanceStrength:-.005227372253106433,startX:.40015507324519745,startY:.28525243239233167,pixelation:4,mandalaRings:7,mandalaPointsPerRing:7,mandalaRadius:.40236454441883973,mandalaRotationSpeed:0,avoiderStrength:.24610870743468016,avoiderRadius:.16642799483069964,redOrGreen:1},{sensorAngle:108,sensorDist:-.06255086230963848,stepSize:.003,turnSpeed:.5106047993121964,wrap:1,decay:.014605671603511186,deposit:.6839264240400561,displayIntensity:1,displayGamma:1,aberration:.002,color:1,flowStrength:.18772378221647215,explore:.5005392473117762,avoidanceStrength:.14083828145191601,startX:.16953238072113525,startY:.3618543561457747,pixelation:4,mandalaRings:7,mandalaPointsPerRing:3,mandalaRadius:.5050678440803534,mandalaRotationSpeed:0,avoiderStrength:-.43703557499765466,avoiderRadius:.7167388027215839,redOrGreen:1},{sensorAngle:5,sensorDist:.02,stepSize:.002,turnSpeed:.5,wrap:1,decay:.41,deposit:.91,displayIntensity:1,displayGamma:1,aberration:.002,color:Math.floor(3*Math.random()),flowStrength:2.4,explore:1.5,avoidanceStrength:.5,startX:.25,startY:.25,pixelation:4,mandalaRings:6,mandalaPointsPerRing:8,mandalaRadius:.3,mandalaRotationSpeed:.2,avoiderStrength:4.1,avoiderRadius:.15,redOrGreen:1},{sensorAngle:52,sensorDist:.02185300241421809,stepSize:.003,turnSpeed:.5642749326827142,wrap:1,decay:.5326479794887384,deposit:.8913860926566008,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:.32093849981065964,explore:.2813326095321662,avoidanceStrength:-.21744651957122996,startX:.25793261727390054,startY:.2547858036899619,pixelation:4,mandalaRings:2,mandalaPointsPerRing:7,mandalaRadius:.6049828513554283,mandalaRotationSpeed:0,avoiderStrength:-3.5006714689686813,avoiderRadius:.10516428243178193,redOrGreen:2},{sensorAngle:175,sensorDist:.03624424291939065,stepSize:.003,turnSpeed:.27938615043926507,wrap:1,decay:.16036936504968474,deposit:.7099494107845915,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.3321892144362,explore:.6950044632717558,avoidanceStrength:-.30904739787363567,startX:.43399894281668505,startY:.424441387554268,pixelation:4,mandalaRings:6,mandalaPointsPerRing:7,mandalaRadius:.414931645360913,mandalaRotationSpeed:0,avoiderStrength:4.173860690885416,avoiderRadius:.4804072722125351,redOrGreen:2},{sensorAngle:128,sensorDist:.010917201758916958,stepSize:.003,turnSpeed:.6940285524353323,wrap:1,decay:.27146028288007,deposit:.32910012812625666,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:.20965156793593806,explore:.9688099189474493,avoidanceStrength:.26401588174088564,startX:.15281904286507092,startY:.029431035627944302,pixelation:4,mandalaRings:6,mandalaPointsPerRing:6,mandalaRadius:.9420903394629883,mandalaRotationSpeed:0,avoiderStrength:3.6887465371798123,avoiderRadius:.15530711868837097,redOrGreen:2},{sensorAngle:167,sensorDist:.061260270014967165,stepSize:.003,turnSpeed:.8612892389034047,wrap:1,decay:.4747621666450931,deposit:.6381385554320269,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:.27678251572013224,explore:.9541968652157439,avoidanceStrength:.11178954315878148,startX:.23376497591133188,startY:.307214425299652,pixelation:4,mandalaRings:1,mandalaPointsPerRing:8,mandalaRadius:.5809294898588889,mandalaRotationSpeed:0,avoiderStrength:.9032184727371835,avoiderRadius:.20746081789996662,redOrGreen:2},{sensorAngle:142,sensorDist:.03165643330910144,stepSize:.003,turnSpeed:.18538717626000603,wrap:1,decay:.27174638047906624,deposit:.4253015214930892,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:.26331504431644553,explore:.7661131710723436,avoidanceStrength:.09695318807507725,startX:.47757212834060453,startY:.32705117039591075,pixelation:4,mandalaRings:6,mandalaPointsPerRing:3,mandalaRadius:.9620273413140601,mandalaRotationSpeed:0,avoiderStrength:3.0081905815851737,avoiderRadius:.1158784787353089,redOrGreen:2},{sensorAngle:35,sensorDist:.04941841560041279,stepSize:.003,turnSpeed:.5752205248075148,wrap:1,decay:.33441238505760496,deposit:.3614395434869947,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:.19691789433200443,explore:.3201068325757964,avoidanceStrength:-.3745404728222752,startX:.04955004963179366,startY:.3936581027648043,pixelation:4,mandalaRings:8,mandalaPointsPerRing:9,mandalaRadius:.5154196527535463,mandalaRotationSpeed:0,avoiderStrength:3.7601894890230314,avoiderRadius:.9705413636535054,redOrGreen:2},{sensorAngle:178,sensorDist:-.02444479184284131,stepSize:.003,turnSpeed:.8658362626764146,wrap:1,decay:.2866866047064537,deposit:.5835537183877674,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:1.8404995941502655,explore:.5817411004975966,avoidanceStrength:-.18227299892704418,startX:.3632604394999707,startY:.1316026571773915,pixelation:4,mandalaRings:5,mandalaPointsPerRing:8,mandalaRadius:.7572459004854745,mandalaRotationSpeed:0,avoiderStrength:-7.469102322758285,avoiderRadius:.23317053304186727,redOrGreen:2},{sensorAngle:89,sensorDist:-.06424569565473398,stepSize:.003,turnSpeed:.3587770132774166,wrap:1,decay:-.2565805676245402,deposit:.4015651280486018,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:2.0663303503254786,explore:.7368022219408678,avoidanceStrength:-.30014769704386945,startX:.415683202653225,startY:.13205606953549154,pixelation:4,mandalaRings:5,mandalaPointsPerRing:2,mandalaRadius:.24768247762847426,mandalaRotationSpeed:0,avoiderStrength:-3.8642421734781953,avoiderRadius:.7295344496635359,redOrGreen:1},{sensorAngle:174,sensorDist:.0019056377705977301,stepSize:.002,turnSpeed:.9705657863262482,wrap:1,decay:-.3641265698242103,deposit:.8797692296371153,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:2.51349924195755,explore:.4942138946574858,avoidanceStrength:.13808125959846462,startX:.3621247076510048,startY:.36112001922103093,pixelation:4,mandalaRings:4,mandalaPointsPerRing:8,mandalaRadius:.15398501646461682,mandalaRotationSpeed:0,avoiderStrength:-7.523840894624708,avoiderRadius:.1070693302373705,redOrGreen:1},{sensorAngle:3,sensorDist:-.07028025768673618,stepSize:.003,turnSpeed:.5165802998392371,wrap:1,decay:-.1916440873437447,deposit:.78929098389229,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.8893792126354122,explore:.33699573759646906,avoidanceStrength:.038125333185129506,startX:.33080710954116493,startY:.09223401581915452,pixelation:4,mandalaRings:1,mandalaPointsPerRing:9,mandalaRadius:.6168684047877712,mandalaRotationSpeed:0,avoiderStrength:-4.354456466510985,avoiderRadius:.1238108348051782,redOrGreen:1},{sensorAngle:15,sensorDist:.011819920114934575,stepSize:.001,turnSpeed:.4800549478456553,wrap:1,decay:.18402550854387806,deposit:.8684266758474956,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:1.3049844362729965,explore:.3700183630529218,avoidanceStrength:.44098988257516897,startX:.23957247422191266,startY:.26487494834828196,pixelation:4,mandalaRings:5,mandalaPointsPerRing:7,mandalaRadius:.8675454309340918,mandalaRotationSpeed:0,avoiderStrength:66.37995179852989,avoiderRadius:.1998487006448969,redOrGreen:1},{sensorAngle:115,sensorDist:.01784185052122003,stepSize:.003,turnSpeed:.7022584560100388,wrap:1,decay:.27713738417406814,deposit:.42686335003539566,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:1.4737888268027048,explore:.3477686467629232,avoidanceStrength:.2535876252553806,startX:.4426956112196846,startY:.45581025209933107,pixelation:4,mandalaRings:8,mandalaPointsPerRing:6,mandalaRadius:.1651928910162827,mandalaRotationSpeed:0,avoiderStrength:3.808507000307268,avoiderRadius:.18555827154843724,redOrGreen:1},{sensorAngle:53,sensorDist:.009659232104936745,stepSize:.003,turnSpeed:.341582545949912,wrap:1,decay:.3390543604402801,deposit:.8817407350369726,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:1.6550165006052908,explore:.6151823297577069,avoidanceStrength:-.3367632557218093,startX:.008971150670725625,startY:.12934163654201897,pixelation:4,mandalaRings:1,mandalaPointsPerRing:2,mandalaRadius:.5346565790094537,mandalaRotationSpeed:0,avoiderStrength:40.050336761371696,avoiderRadius:.15377683896786687,redOrGreen:1},{sensorAngle:23,sensorDist:.027171526017179478,stepSize:.003,turnSpeed:.5187591300564961,wrap:1,decay:.17974367326745816,deposit:.7048621345334307,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.40338058975000285,explore:.33039092267475423,avoidanceStrength:-.3284569415122909,startX:.3387161865376559,startY:.22694105736848685,pixelation:4,mandalaRings:1,mandalaPointsPerRing:8,mandalaRadius:.2868032644083798,mandalaRotationSpeed:0,avoiderStrength:74.41923487338663,avoiderRadius:.18384362913049387,redOrGreen:1},{sensorAngle:104,sensorDist:.03051762019982058,stepSize:.002,turnSpeed:.17251921240851037,wrap:1,decay:.2720263312676009,deposit:.9047552330202072,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:1.3753956279075203,explore:.5382032074926041,avoidanceStrength:.4779214082171697,startX:.2542282980502317,startY:.46434182182973216,pixelation:4,mandalaRings:6,mandalaPointsPerRing:9,mandalaRadius:.4794440471057546,mandalaRotationSpeed:0,avoiderStrength:8.11324652911378,avoiderRadius:.12950498992399156,redOrGreen:0},{sensorAngle:120,sensorDist:.053738084405721184,stepSize:.003,turnSpeed:.20181492113347252,wrap:1,decay:.16171613470923935,deposit:.19264372402578714,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:1.053568910543436,explore:.2005266676177769,avoidanceStrength:.25808078375093435,startX:.2975347743846269,startY:.12179370555605035,pixelation:4,mandalaRings:3,mandalaPointsPerRing:6,mandalaRadius:.7781321606127807,mandalaRotationSpeed:0,avoiderStrength:39.72044042838164,avoiderRadius:.17831686609569175,redOrGreen:1},{sensorAngle:10,sensorDist:.04319085829281621,stepSize:.003,turnSpeed:.5546090842573349,wrap:1,decay:.15780448664522823,deposit:.7451919337267183,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:2.257086236583342,explore:.3898033902483997,avoidanceStrength:.3810625920532209,startX:.16858472690429294,startY:.47075610931407097,pixelation:4,mandalaRings:7,mandalaPointsPerRing:7,mandalaRadius:.750646250644847,mandalaRotationSpeed:0,avoiderStrength:35.1009498917539,avoiderRadius:.12177084727137633,redOrGreen:2},{sensorAngle:146,sensorDist:.00925708905292333,stepSize:.003,turnSpeed:.7802710963098972,wrap:1,decay:.6159114779246364,deposit:.6548485051056914,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:2.232358112987873,explore:.3992680172692872,avoidanceStrength:.1076703215870553,startX:.3424642787068814,startY:.06700411628702324,pixelation:4,mandalaRings:8,mandalaPointsPerRing:6,mandalaRadius:.5659320879970362,mandalaRotationSpeed:0,avoiderStrength:45.60530236232762,avoiderRadius:.1886872004985851,redOrGreen:2},{sensorAngle:161,sensorDist:.016284364828719325,stepSize:.003,turnSpeed:.18215328916962772,wrap:1,decay:.4392490332497688,deposit:.7122452790246411,displayIntensity:1,displayGamma:1,aberration:.001,color:2,flowStrength:2.2521564119145254,explore:.5420238769668774,avoidanceStrength:-.10259770482611108,startX:.42642424419960717,startY:.4561722010262769,pixelation:4,mandalaRings:2,mandalaPointsPerRing:6,mandalaRadius:.7024361393821389,mandalaRotationSpeed:0,avoiderStrength:22.36754196894454,avoiderRadius:.16592711047479403,redOrGreen:2},{sensorAngle:158,sensorDist:.016951629335800456,stepSize:.003,turnSpeed:.792274411170226,wrap:1,decay:-.014418305253951075,deposit:.1252304055601118,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.3853579838429341,explore:.686431005264858,avoidanceStrength:-.1667400709141439,startX:.3451121908661478,startY:.41733742549303177,pixelation:4,mandalaRings:8,mandalaPointsPerRing:4,mandalaRadius:.23956225546555085,mandalaRotationSpeed:0,avoiderStrength:-3.95820472450953,avoiderRadius:.13069488148302968,redOrGreen:2},{sensorAngle:157,sensorDist:.015553336956047093,stepSize:.003,turnSpeed:.7011546576403418,wrap:1,decay:.5129492257342654,deposit:.7210755909975932,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:.6017155704857985,explore:.21714542808578238,avoidanceStrength:.11281770116526019,startX:.4138239935760638,startY:.4690275069344383,pixelation:4,mandalaRings:7,mandalaPointsPerRing:9,mandalaRadius:.817197864805384,mandalaRotationSpeed:0,avoiderStrength:22.48121487656265,avoiderRadius:.18039433603502372,redOrGreen:0},{sensorAngle:139,sensorDist:.04525764657238248,stepSize:.003,turnSpeed:.1958907884275302,wrap:1,decay:.18424797494971967,deposit:.42683791504707747,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:1.5345094714597287,explore:.8079826029833667,avoidanceStrength:-.2123448954004541,startX:.49965900291287746,startY:.3511512630930059,pixelation:4,mandalaRings:8,mandalaPointsPerRing:7,mandalaRadius:.5877932225200173,mandalaRotationSpeed:0,avoiderStrength:7.336515265310531,avoiderRadius:.12375480087978807,redOrGreen:1},{sensorAngle:2,sensorDist:.020978847084483873,stepSize:.003,turnSpeed:.5121764832463847,wrap:1,decay:.10615245206582372,deposit:.4587473812095271,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.818614493658521,explore:.2318576001312912,avoidanceStrength:.4968747063779626,startX:.23652524584133572,startY:.4484473246895038,pixelation:4,mandalaRings:4,mandalaPointsPerRing:8,mandalaRadius:.5514980701636515,mandalaRotationSpeed:0,avoiderStrength:73.76175554640147,avoiderRadius:.11724402746251167,redOrGreen:1},{sensorAngle:46,sensorDist:-.03766471769387084,stepSize:.003,turnSpeed:.7331665739456897,wrap:1,decay:.3774301556829782,deposit:.14192075263155257,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.21836554704371594,explore:.7605106182297554,avoidanceStrength:.2584521857787223,startX:.44727321760285765,startY:.15992371452937088,pixelation:4,mandalaRings:9,mandalaPointsPerRing:8,mandalaRadius:.7237868840306887,mandalaRotationSpeed:0,avoiderStrength:-75.4623859403053,avoiderRadius:.11043805209236111,redOrGreen:2},{sensorAngle:158,sensorDist:.016951629335800456,stepSize:.003,turnSpeed:.792274411170226,wrap:1,decay:-.014418305253951075,deposit:.1252304055601118,displayIntensity:1,displayGamma:1,aberration:.001,color:0,flowStrength:.3853579838429341,explore:.686431005264858,avoidanceStrength:-.1667400709141439,startX:.3451121908661478,startY:.41733742549303177,pixelation:4,mandalaRings:8,mandalaPointsPerRing:8,mandalaRadius:.23956225546555085,mandalaRotationSpeed:0,avoiderStrength:-24.35820472450953,avoiderRadius:.13069488148302968,redOrGreen:1},{sensorAngle:35,sensorDist:.017577038610606003,stepSize:.003,turnSpeed:.46376174982675256,wrap:1,decay:.2577705817662992,deposit:.8176241471069458,displayIntensity:1,displayGamma:1,aberration:.001,color:1,flowStrength:.6899628318191822,explore:.7955601523352265,avoidanceStrength:-.23295081780598226,startX:.26112747105896345,startY:.22361006773526249,pixelation:4,mandalaRings:4,mandalaPointsPerRing:4,mandalaRadius:.8709343042211242,mandalaRotationSpeed:0,avoiderStrength:41.85890976973945,avoiderRadius:.10408912315221486,redOrGreen:2}];
    this.width = 0;
    this.height = 0;
    this.animationFrameId = null;
    this.fps = 60;
    this.fpsInterval = 1000 / this.fps;
    this.then = 0;
    this._init();
    window.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  set sensorDist(value) {
    this.PHYS[this.index].sensorDist = value;
  }

  set stepSize(value) {
    this.PHYS[this.index].stepSize = value;
  }

  set flowStrength(value) {
    this.PHYS[this.index].flowStrength = value;
  }

  set explore(value) {
    this.PHYS[this.index].explore = value;
  }

  set avoidanceStrength(value) {
    this.PHYS[this.index].avoidanceStrength = value;
  }

  set redOrGreen(value) {
    this.PHYS[this.index].redOrGreen = value;
    console.log(JSON.stringify(this.PHYS[this.index], null, 2));
  }

  _init() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); }, false);
    this.canvas.addEventListener('webglcontextrestored', () => location.reload(), false);
    const floatExt = gl.getExtension('OES_texture_float');
    const halfFloatExt = gl.getExtension('OES_texture_half_float');
    this.floatBlendExt = gl.getExtension('EXT_float_blend');
    if (floatExt) {
      this.textureType = gl.FLOAT;
    } else if (halfFloatExt) {
      this.textureType = halfFloatExt.HALF_FLOAT_OES;
    } else {
      this.textureType = gl.UNSIGNED_BYTE;
      this.useFloatEncoding = true;
    }
    this._setupPrograms();
    this._setupBuffers();
    this._setupTextures();
    this._setupDensityMap();
    window.addEventListener('resize', this.resize.bind(this));
    this.resize();
  }

  _createShader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  _createProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, this._createShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, this._createShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  _createFBO(tex) {
    const gl = this.gl;
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) throw new Error('FBO incomplete');
    return fb;
  }

  _createDataTexture(size, data) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    let finalData = data;
    if (this.useFloatEncoding && data) {
      finalData = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        finalData[i] = Math.max(0, Math.min(255, Math.floor((data[i] + 1) * 127.5)));
      }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, this.textureType, finalData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  _createTrailTexture(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, this.textureType, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  _setupTextures() {
    const ratio = window.innerWidth / window.innerHeight;
    const initialData = new Float32Array(this.SIZE * this.SIZE * 4);
    for (let i = 0; i < this.SIZE * this.SIZE; i++) {
      const a = this.random() * Math.PI * 2.0;
      const rad = this.random() * 3.025;
      initialData[i * 4 + 0] = Math.cos(a) * rad * this.PHYS[this.index].startX;
      initialData[i * 4 + 1] = Math.sin(a) * rad * this.PHYS[this.index].startY * ratio;
      initialData[i * 4 + 2] = this.random() * Math.PI * 1.0;
      initialData[i * 4 + 3] = 0.0;
    }
    this.posTexA = this._createDataTexture(this.SIZE, initialData);
    this.posTexB = this._createDataTexture(this.SIZE, null);
    this.frontTex = this.posTexA;
    this.backTex = this.posTexB;

    const propertiesData = new Float32Array(this.SIZE * this.SIZE * 4);
    for (let i = 0; i < this.SIZE * this.SIZE; i++) {
      propertiesData[i * 4 + 0] = 1.0;
      propertiesData[i * 4 + 1] = 0.0;
      propertiesData[i * 4 + 2] = Math.floor(this.random() * 3);
      propertiesData[i * 4 + 3] = 0.0;
    }
    this.propertiesTexture = this._createDataTexture(this.SIZE, propertiesData);
    this.trailTexA = null;
    this.trailTexB = null;
    this.trailFboA = null;
    this.trailFboB = null;
    this.fbo = this.gl.createFramebuffer();
  }

  _setupDensityMap() {
    const gl = this.gl;
    if (this.width === 0 || this.height === 0) return; // Not ready yet
    this.densityTex = this._createTrailTexture(this.width, this.height);
    this.densityFbo = this._createFBO(this.densityTex);
  }

  _setupPrograms() {
    this.updateProgram = this._createProgram(updateVertexShader, physarumUpdateFragmentShader);
    this.decayProgram = this._createProgram(updateVertexShader, trailDecayFragmentShader);
    this.displayProgram = this._createProgram(updateVertexShader, trailDisplayFragmentShader);
    this.depositProgram = this._createProgram(drawVertexShader, depositFragmentShader);
  }

  _setupBuffers() {
    const gl = this.gl;
    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
    this.quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
    const particleIDs = new Float32Array(this.SIZE * this.SIZE * 2);
    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        const i = (y * this.SIZE + x) * 2;
        particleIDs[i + 0] = x;
        particleIDs[i + 1] = y;
      }
    }
    this.idVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.idVBO);
    gl.bufferData(gl.ARRAY_BUFFER, particleIDs, gl.STATIC_DRAW);
  }

  resize() {
    const gl = this.gl;
    const referenceWidth = window.innerWidth > 900 ? window.innerWidth : window.innerWidth*2.0;
    const scale = window.innerWidth / referenceWidth;
    const pixelation = this.PHYS[this.index].pixelation * scale;
    this.width = this.canvas.width = Math.floor(window.innerWidth / pixelation);
    this.height = this.canvas.height = Math.floor(window.innerHeight / pixelation);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.imageRendering = 'crisp-edges';
    this.canvas.style.imageRendering = '-webkit-crisp-edges';
    gl.viewport(0, 0, this.width, this.height);
    if (this.trailTexA) {
      gl.deleteTexture(this.trailTexA);
      gl.deleteTexture(this.trailTexB);
      gl.deleteFramebuffer(this.trailFboA);
      gl.deleteFramebuffer(this.trailFboB);
    }
    if (this.densityTex) {
      gl.deleteTexture(this.densityTex);
      gl.deleteFramebuffer(this.densityFbo);
    }
    this.trailTexA = this._createTrailTexture(this.width, this.height);
    this.trailTexB = this._createTrailTexture(this.width, this.height);
    this.trailFboA = this._createFBO(this.trailTexA);
    this.trailFboB = this._createFBO(this.trailTexB);
    this._setupDensityMap();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailFboA);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailFboB);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _updateAgents() {
    const gl = this.gl;
    gl.useProgram(this.updateProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.backTex, 0);
    gl.viewport(0, 0, this.SIZE, this.SIZE);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    const locPos = gl.getAttribLocation(this.updateProgram, 'a_pos');
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frontTex);
    gl.uniform1i(gl.getUniformLocation(this.updateProgram, 'u_pos'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.propertiesTexture);
    gl.uniform1i(gl.getUniformLocation(this.updateProgram, 'u_properties'), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.trailTexA);
    gl.uniform1i(gl.getUniformLocation(this.updateProgram, 'u_trail'), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.uniform1i(gl.getUniformLocation(this.updateProgram, 'u_density'), 3);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_size'), this.SIZE);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_time'), performance.now() * 0.001);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_ratio'), this.width / this.height);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_random'), Math.random());
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_sensorAngle'), this.PHYS[this.index].sensorAngle);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_sensorDist'), this.PHYS[this.index].sensorDist);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_stepSize'), this.PHYS[this.index].stepSize);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_turnSpeed'), this.PHYS[this.index].turnSpeed);
    gl.uniform1i(gl.getUniformLocation(this.updateProgram, 'u_wrap'), this.PHYS[this.index].wrap);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_flowStrength'), this.PHYS[this.index].flowStrength);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_explore'), this.PHYS[this.index].explore);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_avoidanceStrength'), this.PHYS[this.index].avoidanceStrength);
    gl.uniform2f(gl.getUniformLocation(this.updateProgram, 'u_resolution'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_mandalaRings'), this.PHYS[this.index].mandalaRings);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_mandalaPointsPerRing'), this.PHYS[this.index].mandalaPointsPerRing);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_mandalaRadius'), this.PHYS[this.index].mandalaRadius);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_mandalaRotationSpeed'), this.PHYS[this.index].mandalaRotationSpeed);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_avoiderStrength'), this.PHYS[this.index].avoiderStrength);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_avoiderRadius'), this.PHYS[this.index].avoiderRadius);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _decayTrail() {
    const gl = this.gl;
    gl.useProgram(this.decayProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailFboB);
    gl.viewport(0, 0, this.width, this.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    const locPos = gl.getAttribLocation(this.decayProgram, 'a_pos');
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailTexA);
    gl.uniform1i(gl.getUniformLocation(this.decayProgram, 'u_trail'), 0);
    gl.uniform1f(gl.getUniformLocation(this.decayProgram, 'u_decay'), this.PHYS[this.index].decay);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    [this.trailTexA, this.trailTexB] = [this.trailTexB, this.trailTexA];
    [this.trailFboA, this.trailFboB] = [this.trailFboB, this.trailFboA];
  }

  _depositAgents() {
    const gl = this.gl;
    gl.useProgram(this.depositProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailFboA);
    gl.viewport(0, 0, this.width, this.height);
    if (this.useFloatEncoding || this.floatBlendExt) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.idVBO);
    const locId = gl.getAttribLocation(this.depositProgram, 'a_id');
    gl.enableVertexAttribArray(locId);
    gl.vertexAttribPointer(locId, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backTex);
    gl.uniform1i(gl.getUniformLocation(this.depositProgram, 'u_pos'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.propertiesTexture);
    gl.uniform1i(gl.getUniformLocation(this.depositProgram, 'u_properties'), 1);
    gl.uniform1f(gl.getUniformLocation(this.depositProgram, 'u_size'), this.SIZE);
    gl.uniform1f(gl.getUniformLocation(this.depositProgram, 'u_ratio'), this.width / this.height);
    gl.uniform1f(gl.getUniformLocation(this.depositProgram, 'u_deposit'), this.PHYS[this.index].deposit);
    gl.drawArrays(gl.POINTS, 0, this.SIZE * this.SIZE);
    if (this.useFloatEncoding || this.floatBlendExt) {
      gl.disable(gl.BLEND);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _updateDensity() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.depositProgram);
    if (this.useFloatEncoding || this.floatBlendExt) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.idVBO);
    const locId = gl.getAttribLocation(this.depositProgram, 'a_id');
    gl.enableVertexAttribArray(locId);
    gl.vertexAttribPointer(locId, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frontTex);
    gl.uniform1i(gl.getUniformLocation(this.depositProgram, 'u_pos'), 0);
    gl.uniform1f(gl.getUniformLocation(this.depositProgram, 'u_size'), this.SIZE);
    gl.uniform1f(gl.getUniformLocation(this.depositProgram, 'u_ratio'), this.width / this.height);
    gl.uniform1f(gl.getUniformLocation(this.depositProgram, 'u_deposit'), 1.0);
    gl.drawArrays(gl.POINTS, 0, this.SIZE * this.SIZE);
    if (this.useFloatEncoding || this.floatBlendExt) {
      gl.disable(gl.BLEND);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _displayTrail() {
    const gl = this.gl;
    gl.useProgram(this.displayProgram);
    gl.viewport(0, 0, this.width, this.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    const locPos = gl.getAttribLocation(this.displayProgram, 'a_pos');
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailTexA);
    gl.uniform1i(gl.getUniformLocation(this.displayProgram, 'u_trail'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.propertiesTexture);
    gl.uniform1i(gl.getUniformLocation(this.displayProgram, 'u_properties'), 1);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_intensity'), this.PHYS[this.index].displayIntensity);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_gamma'), this.PHYS[this.index].displayGamma);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_time'), performance.now() * 0.001);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_aberration'), this.PHYS[this.index].aberration);
    gl.uniform2f(gl.getUniformLocation(this.displayProgram, 'u_resolution'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_mandalaRings'), this.PHYS[this.index].mandalaRings);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_mandalaPointsPerRing'), this.PHYS[this.index].mandalaPointsPerRing);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_mandalaRadius'), this.PHYS[this.index].mandalaRadius);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_mandalaRotationSpeed'), this.PHYS[this.index].mandalaRotationSpeed);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_avoiderRadius'), this.PHYS[this.index].avoiderRadius);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_ratio'), this.width / this.height);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_toggleAvoiderDisplay'), this.toggleAvoiderDisplay ? 1.0 : 0.0);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_redOrGreen'), this.PHYS[this.index].redOrGreen);
    gl.uniform1f(gl.getUniformLocation(this.displayProgram, 'u_bloom'), this.bloom);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  loop() {
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    const now = performance.now();
    const elapsed = now - this.then;
    if (elapsed > this.fpsInterval) {
      this.then = now - (elapsed % this.fpsInterval);
      this.PHYS[this.index].sensorAngle = performance.now() % 10000 > 5000 ? 0.95 : 0.5;
      this._updateDensity();
      this._updateAgents();
      this._decayTrail();
      this._depositAgents();
      this._displayTrail();

      [this.frontTex, this.backTex] = [this.backTex, this.frontTex];
    }
  }

  start() {
    if (!this.animationFrameId) {
      this.then = performance.now();
      this.loop();
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  handleKeyPress(event) {
    if (event.key === 'a' || event.key === 'A') {
      this.toggleAvoiderDisplay = !this.toggleAvoiderDisplay;
    }
    if (event.key === 's' || event.key === 'S') {
      this.saveFrame();
    }
  }

  saveFrame() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = window.innerWidth;
    tempCanvas.height = window.innerHeight;
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.mozImageSmoothingEnabled = false;
    tempCtx.webkitImageSmoothingEnabled = false;
    tempCtx.msImageSmoothingEnabled = false;
    tempCtx.drawImage(this.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    const link = document.createElement('a');
    link.download = `eukar-${this.seed}-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }


}


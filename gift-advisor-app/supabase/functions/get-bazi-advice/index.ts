import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ganWuXing: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

const ganYinYang: Record<string, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴'
};

const zhiMainQi: Record<string, string> = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙',
  '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
  '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
};

const wuXingSheng: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const wuXingKe: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

const whoShengMe: Record<string, string> = {};
for (const [key, value] of Object.entries(wuXingSheng)) { whoShengMe[value] = key; }
const whoKeMe: Record<string, string> = {};
for (const [key, value] of Object.entries(wuXingKe)) { whoKeMe[value] = key; }

const wuXingGiftMap: Record<string, { color: string; element: string; gifts: string[] }> = {
  '木': { color: '绿色、青色', element: '木属性', gifts: ['绿植盆栽', '檀木手串', '竹制茶盘', '木雕工艺品', '文房四宝'] },
  '火': { color: '红色、紫色', element: '火属性', gifts: ['南红玛瑙', '红水晶摆件', '创意氛围灯', '手工香薰蜡烛', '紫铜工艺品'] },
  '土': { color: '黄色、棕色', element: '土属性', gifts: ['黄水晶', '陶瓷茶具', '复古皮具', '手工陶器', '精品茶叶礼盒'] },
  '金': { color: '白色、金色', element: '金属性', gifts: ['白水晶', '纯银饰品', '金属书签', '精工钢笔', '手表配饰'] },
  '水': { color: '蓝色、黑色', element: '水属性', gifts: ['海蓝宝', '黑曜石手串', '鱼缸摆件', '香薰加湿器', '蓝染工艺品'] }
};

const BASE_DATE = new Date(1900, 0, 1);
const BASE_GANZHI_INDEX = 10;
const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const hourGanTable = [
  ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'],
  ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'],
  ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'],
  ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'],
  ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
];

function getDaysBetween(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function getYearGanZhi(year: number): string {
  const diff = year - 1900;
  const ganIndex = ((diff % 10) + 10) % 10;
  const zhiIndex = ((diff % 12) + 12) % 12;
  return tianGan[ganIndex] + diZhi[zhiIndex];
}

function getMonthGanZhi(year: number, month: number): string {
  const yearGan = getYearGanZhi(year)[0];
  const yearGanIndex = tianGan.indexOf(yearGan);
  const ganStartIndex = (yearGanIndex * 2) % 10;
  const monthGanIndex = (ganStartIndex + month - 1) % 10;
  const monthZhiIndex = (month + 1) % 12;
  return tianGan[monthGanIndex] + diZhi[monthZhiIndex];
}

function getDayGanZhi(year: number, month: number, day: number): string {
  const target = new Date(year, month - 1, day);
  const daysDiff = getDaysBetween(BASE_DATE, target);
  const ganzhiIndex = ((BASE_GANZHI_INDEX + daysDiff) % 60 + 60) % 60;
  const ganIndex = ganzhiIndex % 10;
  const zhiIndex = ganzhiIndex % 12;
  return tianGan[ganIndex] + diZhi[zhiIndex];
}

function getHourGanZhi(dayGan: string, hour: number): string {
  const dayGanIndex = tianGan.indexOf(dayGan);
  const hourZhiIndex = Math.floor((hour + 1) / 2) % 12;
  const rowIndex = dayGanIndex % 5;
  const hourGan = hourGanTable[rowIndex][hourZhiIndex];
  return hourGan + diZhi[hourZhiIndex];
}

function countWuXingWeights(yearGZ: string, monthGZ: string, dayGZ: string, hourGZ: string): Record<string, number> {
  const weights: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  weights[ganWuXing[yearGZ[0]]] = (weights[ganWuXing[yearGZ[0]]] || 0) + 0.5;
  weights[ganWuXing[zhiMainQi[yearGZ[1]]]] = (weights[ganWuXing[zhiMainQi[yearGZ[1]]]] || 0) + 0.3;
  weights[ganWuXing[monthGZ[0]]] = (weights[ganWuXing[monthGZ[0]]] || 0) + 1.0;
  weights[ganWuXing[zhiMainQi[monthGZ[1]]]] = (weights[ganWuXing[zhiMainQi[monthGZ[1]]]] || 0) + 1.5;
  weights[ganWuXing[zhiMainQi[dayGZ[1]]]] = (weights[ganWuXing[zhiMainQi[dayGZ[1]]]] || 0) + 0.8;
  weights[ganWuXing[hourGZ[0]]] = (weights[ganWuXing[hourGZ[0]]] || 0) + 0.4;
  weights[ganWuXing[zhiMainQi[hourGZ[1]]]] = (weights[ganWuXing[zhiMainQi[hourGZ[1]]]] || 0) + 0.2;
  return weights;
}

function determineStrength(riGan: string, yueZhi: string, yearGZ: string, monthGZ: string, dayGZ: string, hourGZ: string): '极强' | '偏强' | '中和' | '偏弱' | '极弱' {
  const riWuxing = ganWuXing[riGan];
  const shengWo = whoShengMe[riWuxing];
  const keWo = whoKeMe[riWuxing];
  const woSheng = wuXingSheng[riWuxing];
  const woKe = wuXingKe[riWuxing];
  const weights = countWuXingWeights(yearGZ, monthGZ, dayGZ, hourGZ);
  const supportPower = (weights[riWuxing] || 0) + (weights[shengWo] || 0);
  const restrainPower = (weights[keWo] || 0) + (weights[woSheng] || 0) + (weights[woKe] || 0);
  const ratio = supportPower / (restrainPower + 0.01);
  if (ratio > 2.5) return '极强';
  if (ratio > 1.5) return '偏强';
  if (ratio > 0.8) return '中和';
  if (ratio > 0.4) return '偏弱';
  return '极弱';
}

function determineXiYongShen(riWuxing: string, strength: string, month: number): { xiShen: string; yongShen: string; jiShen: string; reasoning: string } {
  const shengWo = whoShengMe[riWuxing];
  const keWo = whoKeMe[riWuxing];
  const woSheng = wuXingSheng[riWuxing];
  const woKe = wuXingKe[riWuxing];

  switch (strength) {
    case '极强':
      return { xiShen: keWo, yongShen: woSheng, jiShen: shengWo, reasoning: `日主${riWuxing}极强，急需${keWo}（官杀）来克制，${woSheng}（食伤）来泄秀。最忌${shengWo}（印星）再来生扶。` };
    case '偏强':
      return { xiShen: keWo, yongShen: woSheng, jiShen: shengWo, reasoning: `日主${riWuxing}偏强，以${keWo}（官杀）为喜神来平衡，${woSheng}（食伤）为用神泄其旺气。忌${shengWo}（印星）再生扶。` };
    case '偏弱':
      return { xiShen: shengWo, yongShen: riWuxing, jiShen: keWo, reasoning: `日主${riWuxing}偏弱，以${shengWo}（印星）为喜神来生扶，${riWuxing}（比劫）为用神相助。忌${keWo}（官杀）再来克制。` };
    case '极弱':
      return { xiShen: shengWo, yongShen: riWuxing, jiShen: keWo, reasoning: `日主${riWuxing}极弱，急需${shengWo}（印星）来生扶补益，${riWuxing}（比劫）为用神帮扶。最忌${keWo}（官杀）再来克制。` };
    default:
      if (month >= 5 && month <= 7) return { xiShen: '水', yongShen: riWuxing, jiShen: '火', reasoning: `夏月火旺燥热，以「水」调候为先。` };
      if (month >= 11 || month <= 1) return { xiShen: '火', yongShen: riWuxing, jiShen: '水', reasoning: `冬月水寒木冻，以「火」暖局为先。` };
      return { xiShen: riWuxing, yongShen: wuXingSheng[riWuxing], jiShen: whoKeMe[riWuxing], reasoning: `日主中和，以本气${riWuxing}为喜神，${wuXingSheng[riWuxing]}为用神流通。` };
  }
}

function buildGiftAdvice(riGan: string, riWuxing: string, strength: string, xiShen: string, yongShen: string, jiShen: string, reasoning: string): string {
  const giftInfo = wuXingGiftMap[xiShen];
  const yongGiftInfo = wuXingGiftMap[yongShen];
  const jiGiftInfo = wuXingGiftMap[jiShen];
  let advice = `📊 八字分析结果\n日主：${riGan}（${riWuxing}${ganYinYang[riGan]}）\n强弱：${strength}\n喜神：${xiShen} | 用神：${yongShen} | 忌神：${jiShen}\n\n📝 分析依据\n${reasoning}\n\n`;
  if (giftInfo) {
    advice += `🎁 推荐礼物（喜神${xiShen}）\n颜色：${giftInfo.color}\n具体建议：\n`;
    giftInfo.gifts.slice(0, 5).forEach((gift, i) => { advice += `  ${i + 1}. ${gift}\n`; });
  }
  if (yongGiftInfo && yongShen !== xiShen) {
    advice += `\n💡 辅助推荐（用神${yongShen}）\n颜色：${yongGiftInfo.color}\n建议：${yongGiftInfo.gifts.slice(0, 3).join('、')}\n`;
  }
  if (jiGiftInfo) {
    advice += `\n⚠️ 送礼避雷（忌神${jiShen}）\n建议避免：${jiGiftInfo.color}系的礼物\n`;
  }
  return advice;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { year, month, day, hour } = await req.json();
    if (!year || !month || !day) return new Response(JSON.stringify({ error: "请提供完整的出生年月日信息" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const h = hour !== undefined ? hour : 12;
    const yearGZ = getYearGanZhi(year), monthGZ = getMonthGanZhi(year, month), dayGZ = getDayGanZhi(year, month, day), hourGZ = getHourGanZhi(dayGZ[0], h);
    const riGan = dayGZ[0], yueZhi = monthGZ[1];
    const riWuxing = ganWuXing[riGan];
    const strength = determineStrength(riGan, yueZhi, yearGZ, monthGZ, dayGZ, hourGZ);
    const { xiShen, yongShen, jiShen, reasoning } = determineXiYongShen(riWuxing, strength, month);
    const advice = buildGiftAdvice(riGan, riWuxing, strength, xiShen, yongShen, jiShen, reasoning);
    return new Response(JSON.stringify({ advice, detail: { 年柱: yearGZ, 月柱: monthGZ, 日柱: dayGZ, 时柱: hourGZ, 日主五行: riWuxing, 喜神: xiShen, 用神: yongShen, 忌神: jiShen, 日主强弱: strength } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
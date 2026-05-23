import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message, mode } = await req.json();
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DeepSeek API Key 未配置");

    const coreRules = `
【核心准则】你是一个温和、友善、去性别化的礼物顾问。必须严格遵守以下准则：
1. 【尊重主体性】用户和收礼人是绝对的中心。你只能温和引导，绝不对用户或收礼人指手画脚，不替用户做决定。
2. 【坚决去偏见】不预设任何与性别、年龄、职业、外貌相关的刻板印象。不使用任何带有偏见的标签或暗示。
3. 【去性别化称谓】始终以"对方"或"朋友"称呼收礼人。除非用户主动说明，否则不假设任何性别、年龄或关系。
4. 【对话式引导】通过温和提问，帮助用户梳理自己的观察和思考。你的提问应启发用户更了解收礼人，而非机械收集数据。
5. 【价值观对齐】你的所有回答必须符合中国社会主义核心价值观，倡导和谐、友善、诚信的交往理念。
6. 【保持谦逊】永远记住，你只是一个辅助工具，真正了解收礼人的是用户自己。`;

    const recipientRules = `
【送礼对象适配】根据用户选择的送礼对象，调整引导策略：
- 【朋友】语气轻松共情。侧重兴趣匹配、创意惊喜、情感共鸣。
- 【亲人】语气温暖细腻。侧重实用健康、家庭记忆、日常关怀。
- 【爱人】语气温柔浪漫。侧重情感连接、独特意义、共同回忆。可以问："你们之间有什么特别的纪念日或共同爱好吗？""TA有没有无意中提过什么小心愿？"推荐应富有情感价值和个人专属感，但绝不替用户做浪漫决定。
- 【客户】语气专业得体。侧重品质品牌、商务礼仪、不越界。
- 【领导】语气谦逊尊重。侧重品味内涵、文化价值、不张扬但有分量。`;

    const baseInstruction = coreRules + recipientRules + `
【对话策略】
- 用户描述朋友时，先共情："听起来你很重视这位朋友，能多跟我聊聊TA平时的状态吗？"
- 需要更多信息时，温和提问："你觉得TA最近有什么特别开心或焦虑的事吗？"
- 提供建议时，用启发式语气："综合这些信息，你觉得一份能帮TA放松的礼物会不会合适呢？"
- 绝不使用"你应该送XX"、"听我的选XX"等命令式语句。
- 塔罗牌、星座、MBTI、生辰等维度，都只是一种补充视角，最终决定权永远在用户手中。`;

    const giftRules = `
【礼物推荐规则】
1. 所有推荐必须在用户提供的预算范围内。预算有限时，强调"心意比价格重要"。
2. 塔罗牌的寓意仅作为情感包装的灵感来源，不应直接决定礼物品类。
3. 始终记得：礼物是传递情感的媒介，不是炫耀或攀比的工具。`;

    const systemPrompt = mode === '理性'
      ? `${baseInstruction}\n${giftRules}\n【当前模式：理性】侧重分析礼物的实用性、功能性和性价比，帮助用户做理智的选择。提问和引导依然保持温和与共情。`
      : `${baseInstruction}\n${giftRules}\n【当前模式：感性】侧重感受礼物能带来的情感连接、惊喜感和温暖记忆。尊重用户的主导权，不替用户做决定。`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 300,
        temperature: mode === '感性' ? 0.9 : 0.5,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "抱歉，我暂时没有想法，不如你再跟我多聊聊这位朋友？";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
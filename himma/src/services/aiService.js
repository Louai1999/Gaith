const config = require('../config');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../lib/logger');

async function callAnthropic({ system, messages, maxTokens = 1000 }) {
  if (!config.anthropicApiKey) {
    throw new AppError('خدمة الذكاء الاصطناعي غير مهيّأة على الخادم.', 503);
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.error({ message: 'Anthropic API error', status: response.status, body });
      throw new AppError('تعذّر الاتصال بخدمة الذكاء الاصطناعي.', 502);
    }
    return response.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ message: 'Anthropic request failed', error: err.message });
    throw new AppError('تعذّر الاتصال بخدمة الذكاء الاصطناعي.', 502);
  }
}

async function estimateMeal(description) {
  const system = `أنت خبير تغذية. المستخدم سيصف لك وجبة بالعربية بكلامه العادي، ومهمتك تقدير مكوناتها وسعراتها الحرارية وقيمها الغذائية بشكل واقعي بناءً على أحجام حصص عادية (استخدم تقديرات معقولة للكمية بالغرام إذا لم يذكرها المستخدم).
أجب فقط بصيغة JSON صالحة بدون أي نص إضافي أو علامات markdown، بهذا الشكل بالضبط:
{"items":[{"name":"اسم الصنف بالعربية","grams":رقم,"calories":رقم,"protein":رقم,"carbs":رقم,"fat":رقم}],"total_calories":رقم,"total_protein":رقم,"total_carbs":رقم,"total_fat":رقم}
لا تكتب أي شيء خارج كائن JSON.`;

  const data = await callAnthropic({
    system,
    messages: [{ role: 'user', content: description }],
  });
  const textBlocks = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const clean = textBlocks.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function coachReply({ contextLines, messages }) {
  const system = contextLines.join('\n');
  const apiMessages = messages.slice(-12).map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
  const data = await callAnthropic({ system, messages: apiMessages });
  return (
    (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim() || 'ما قدرت أرد، حاول مرة ثانية.'
  );
}

module.exports = { estimateMeal, coachReply };

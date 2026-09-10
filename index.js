require('dotenv').config();
const { Bot } = require('grammy');
const { createClient } = require('@supabase/supabase-js');

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Ключевые слова для автоматического определения категории.
// Можно смело дописывать свои слова в любой список.
const CATEGORY_KEYWORDS = {
  'Еда': ['еда', 'кафе', 'ресторан', 'продукты', 'пятерочка', 'пятёрочка', 'магнит', 'ашан', 'перекресток', 'перекрёсток', 'кофе', 'обед', 'ужин', 'завтрак'],
  'Транспорт': ['такси', 'метро', 'автобус', 'бензин', 'заправка', 'парковка', 'каршеринг'],
  'Жилье': ['аренда', 'квартира', 'коммуналка', 'жкх', 'ипотека'],
  'Развлечения': ['кино', 'театр', 'концерт', 'игра', 'подписка'],
  'Здоровье': ['аптека', 'врач', 'лекарства', 'больница', 'стоматолог'],
};

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return category;
  }
  return 'Прочее';
}

// Понимает сообщения вида "такси 500" или "продукты 1240.50"
function parseMessage(text) {
  const match = text.match(/^(.+?)\s+(\d+([.,]\d+)?)\s*(?:р|руб|₽)?$/i);
  if (!match) return null;
  const description = match[1].trim();
  const amount = parseFloat(match[2].replace(',', '.'));
  return { description, amount };
}

bot.command('start', (ctx) => {
  ctx.reply(
    'Привет! Просто пиши мне трату в формате "такси 500" — я запишу её в общий бюджет.\n\nКоманда /баланс покажет расходы за текущий месяц.\n\nЕсли хотите вести бюджет вдвоём — добавьте меня в общий чат с партнёром, и я буду записывать траты от вас обоих.'
  );
});

bot.command('баланс', async (ctx) => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', start.toISOString());

  if (error) {
    await ctx.reply('Не получилось получить данные, попробуй позже.');
    return;
  }

  const total = data.reduce((sum, row) => sum + Number(row.amount), 0);
  const byCategory = {};
  for (const row of data) {
    byCategory[row.category] = (byCategory[row.category] || 0) + Number(row.amount);
  }

  let text = `Расходы с начала месяца: ${total.toFixed(0)} ₽\n\n`;
  for (const [cat, sum] of Object.entries(byCategory)) {
    text += `${cat}: ${sum.toFixed(0)} ₽\n`;
  }

  await ctx.reply(text);
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  const parsed = parseMessage(text);
  if (!parsed) {
    await ctx.reply('Не понял сумму. Формат: "такси 500" или "продукты 1240".');
    return;
  }

  const category = detectCategory(parsed.description);
  const person = ctx.from.first_name || 'Неизвестно';

  const { error } = await supabase.from('transactions').insert({
    description: parsed.description,
    amount: parsed.amount,
    category,
    person,
    source: 'telegram',
  });

  if (error) {
    await ctx.reply('Не получилось сохранить, попробуй ещё раз.');
    return;
  }

  await ctx.reply(`Записал: ${parsed.description} — ${parsed.amount.toFixed(0)} ₽ (${category})`);
});

bot.start();
console.log('Бот запущен');

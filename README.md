# Family budget bot

Простой Telegram-бот: пишешь ему трату вроде "такси 500" — он сохраняет её в базу и определяет категорию по ключевым словам.

## SQL для Supabase

Открой в Supabase раздел **SQL Editor**, вставь и выполни:

```sql
create table transactions (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  description text not null,
  amount numeric not null,
  category text not null,
  person text not null,
  source text default 'manual'
);
```

## Переменные окружения

Скопируй `.env.example` в `.env` (или задай эти же переменные в настройках Railway):

- `BOT_TOKEN` — токен, который дал @BotFather
- `SUPABASE_URL` — Project URL из Supabase (Settings → API)
- `SUPABASE_KEY` — anon public key из Supabase (Settings → API)

## Команды бота

- Любое сообщение вида "продукты 1240" — записывает трату
- `/баланс` — расходы с начала текущего месяца по категориям

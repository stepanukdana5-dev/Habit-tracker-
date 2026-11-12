// ===============================================
//  Трекер привычек — вся логика в одном файле.
//  Данные хранятся в браузере (localStorage),
//  поэтому сервер и база данных не нужны.
// ===============================================

const STORAGE_KEY = 'habits';

// Привычка выглядит так:
// { id: "abc", name: "Пить воду", emoji: "💧", done: ["2026-11-12", ...] }
let habits = loadHabits();

// ---------- Работа с хранилищем ----------
function loadHabits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch {
    // Например, в приватном режиме браузера — просто ничего не сохраняем
  }
}

// ---------- Даты ----------
// Превращаем дату в строку "ГГГГ-ММ-ДД" (по местному времени)
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Последние 7 дней: от 6 дней назад до сегодня
function lastSevenDays() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

// Серия: сколько дней подряд привычка выполнена.
// Если сегодня ещё не отмечено — считаем со вчера (серия не сгорает до конца дня).
function getStreak(habit) {
  let streak = 0;
  const day = new Date();
  if (!habit.done.includes(toKey(day))) day.setDate(day.getDate() - 1);
  while (habit.done.includes(toKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

// Правильное окончание: 1 день, 2 дня, 5 дней
function daysWord(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}

// ---------- Действия ----------
function addHabit(name, emoji) {
  habits.push({
    id: Date.now().toString(36),
    name,
    emoji: emoji || '✅',
    done: [],
  });
  saveHabits();
  render();
}

function toggleDay(id, dateKey) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  if (habit.done.includes(dateKey)) {
    habit.done = habit.done.filter(d => d !== dateKey); // снять отметку
  } else {
    habit.done.push(dateKey); // поставить отметку
  }
  saveHabits();
  render();
}

function deleteHabit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit || !confirm(`Удалить привычку «${habit.name}»?`)) return;
  habits = habits.filter(h => h.id !== id);
  saveHabits();
  render();
}

// ---------- Отрисовка ----------
const listEl = document.getElementById('habits');
const emptyEl = document.getElementById('empty');
const weekdayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

function render() {
  const todayKey = toKey(new Date());
  const days = lastSevenDays();
  listEl.innerHTML = '';

  habits.forEach(habit => {
    const streak = getStreak(habit);
    const li = document.createElement('li');
    li.className = 'habit';

    // Верхняя строка: эмодзи, название, серия, кнопка удаления
    li.innerHTML = `
      <div class="habit-top">
        <span class="habit-emoji"></span>
        <div class="habit-info">
          <div class="habit-name"></div>
          <div class="habit-streak">${streak > 0 ? `🔥 ${streak} ${daysWord(streak)} подряд` : 'Серия ещё не началась'}</div>
        </div>
        <button class="delete-btn" title="Удалить">✕</button>
      </div>
      <div class="week"></div>
    `;
    // Текст вставляем через textContent — так безопаснее, чем через innerHTML
    li.querySelector('.habit-emoji').textContent = habit.emoji;
    li.querySelector('.habit-name').textContent = habit.name;
    li.querySelector('.delete-btn').onclick = () => deleteHabit(habit.id);

    // 7 кружков — по одному на каждый день недели
    const weekEl = li.querySelector('.week');
    days.forEach(day => {
      const key = toKey(day);
      const isDone = habit.done.includes(key);
      const btn = document.createElement('button');
      btn.className = 'day' + (isDone ? ' done' : '') + (key === todayKey ? ' is-today' : '');
      btn.title = day.toLocaleDateString('ru-RU');
      btn.innerHTML = `<span>${weekdayFmt.format(day)}</span><span class="day-circle">${isDone ? '✓' : day.getDate()}</span>`;
      btn.onclick = () => toggleDay(habit.id, key);
      weekEl.appendChild(btn);
    });

    listEl.appendChild(li);
  });

  // Прогресс за сегодня
  const doneToday = habits.filter(h => h.done.includes(todayKey)).length;
  const percent = habits.length ? (doneToday / habits.length) * 100 : 0;
  document.getElementById('progress-label').textContent = `${doneToday} / ${habits.length}`;
  document.getElementById('progress-fill').style.width = percent + '%';

  emptyEl.classList.toggle('hidden', habits.length > 0);
}

// ---------- Запуск ----------
document.getElementById('today').textContent = new Date().toLocaleDateString('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long',
});

document.getElementById('add-form').addEventListener('submit', event => {
  event.preventDefault(); // чтобы страница не перезагружалась
  const nameInput = document.getElementById('name-input');
  const emojiInput = document.getElementById('emoji-input');
  const name = nameInput.value.trim();
  if (!name) return;
  addHabit(name, emojiInput.value.trim());
  nameInput.value = '';
  nameInput.focus();
});

render();

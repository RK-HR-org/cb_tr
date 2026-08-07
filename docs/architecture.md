# Архитектура приложения

Проект использует инкрементальную FSD-структуру. Старые `views` пока содержат
реализации страниц, но роутер подключает их только через публичные API в
`pages/*`. Новая предметная логика должна размещаться в слоях ниже.

## Слои

- `app` — инициализация приложения и providers.
- `pages` — публичные точки входа маршрутов и композиция страницы.
- `widgets` — крупные самостоятельные блоки страниц.
- `features` — пользовательские сценарии, например единый редактор активности.
- `entities` — модели предметной области и единственные точки CRUD/API.
- `shared` — Supabase client, инфраструктурные типы, UI-примитивы и date-utils.

Импорты разрешены только сверху вниз. Страницы, widgets, features, stores и UI
не обращаются к Supabase напрямую. Это проверяет `npm run check:architecture`.

## Где добавлять CRUD

- Тренеры: `src/entities/trainer/api/trainer.api.ts`.
- Проекты: `src/entities/project/api/project.api.ts`.
- Активности: `src/entities/activity/api/activity.api.ts`.
- Справочники: `src/entities/dictionary/api/dictionary.api.ts`.
- Аналитические read-модели: `src/entities/analytics/api/analytics.api.ts`.

Технический Supabase client находится в `src/shared/api/supabase`. UI не должен
импортировать его напрямую.

## Как добавить поле активности

1. Создать новую миграцию в `supabase/migrations`.
2. Обновить/перегенерировать `shared/api/supabase/database.types.ts`.
3. Добавить поле в `entities/activity/model/types.ts`.
4. Обновить mapping и validation в `entities/activity/model/form.ts`.
5. Добавить поле один раз в `features/activity-editor/ui/ActivityForm.vue`.
6. При необходимости вывести поле в таблице, календаре, Gantt или аналитике.

Форма активности не должна копироваться в страницы. Таблица тренера, календарь
и Gantt используют `features/activity-editor`.

## Как добавить поле тренера или проекта

Атрибуты самого тренера размещаются в `trainers`, атрибуты проекта — в
`project_names` (legacy-имя таблицы проектов). Данные конкретного участия
тренера в активности размещаются в `trainer_projects`.

После миграции обновляются:

1. Database types.
2. `entities/trainer` или `entities/project`.
3. Соответствующая feature-форма.
4. Нужные read-модели.

Не следует добавлять сведения о заказчике, статусе или описании проекта в
`trainer_projects`: это создаст дублирование на каждую активность.

## База данных

`202607160001_initial_schema.sql` является воспроизводимой начальной схемой.
Legacy-названия `project_names` и `trainer_projects` пока сохранены, чтобы не
ломать существующие данные и внешние импорты.

RLS нельзя включать до перехода на Supabase Auth: текущий вход по числовому ID
не создаёт серверной пользовательской сессии. Ролевой guard в роутере защищает
навигацию интерфейса, но не заменяет серверные политики доступа.

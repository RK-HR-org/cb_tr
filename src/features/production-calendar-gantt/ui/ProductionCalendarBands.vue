<script setup lang="ts">
import { computed } from 'vue'
import { useGanttContext } from '@dizzy_yakov/vue-gantt'
import type { ProductionCalendarDay } from '../../../entities/production-calendar'
import { parseLocalDate } from '../../../shared/lib/date'

const props = defineProps<{
  days: ProductionCalendarDay[]
}>()

const { contentHeight, dateToX } = useGanttContext()
const bands = computed(() => props.days.flatMap((day) => {
  const start = parseLocalDate(day.event_date)
  if (!start) return []
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const left = dateToX(start)
  const width = Math.max(1, dateToX(end) - left)
  return [{ ...day, left, width }]
}))
</script>

<template>
  <div class="production-calendar-bands" :style="{ height: `${contentHeight}px` }" aria-hidden="true">
    <div
      v-for="band in bands"
      :key="band.id"
      class="production-calendar-band"
      :class="`production-calendar-band--${band.day_type}`"
      :style="{
        left: `${band.left}px`,
        width: `${band.width}px`,
        height: `${contentHeight}px`,
      }"
      :title="band.name"
    />
  </div>
</template>

<style scoped>
.production-calendar-bands { pointer-events:none; position:absolute; inset:0 auto auto 0 }
.production-calendar-band { position:absolute; top:0; box-sizing:border-box }
.production-calendar-band--holiday {
  background:rgba(239,68,68,.20);
  border-inline:1px solid rgba(220,38,38,.22);
}
.production-calendar-band--working_saturday {
  background:rgba(234,179,8,.25);
  border-inline:1px solid rgba(202,138,4,.25);
}
</style>

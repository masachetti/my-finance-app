<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import EventCard from '@/components/events/EventCard.vue'
import EventForm from '@/components/events/EventForm.vue'
import EventDeleteModal from '@/components/events/EventDeleteModal.vue'
import type { Event, EventInsert, EventUpdate } from '@/types/database'
import { useI18n } from '@/composables/useI18n'
import { useEventsStore } from '@/stores/events'

const { t } = useI18n()
const router = useRouter()
const eventsStore = useEventsStore()

// Modal state
const showForm = ref(false)
const editingEvent = ref<Event | null>(null)
const showDeleteConfirm = ref(false)
const eventToDelete = ref<Event | null>(null)

// Filter state
const activeFilter = ref<'all' | 'active' | 'upcoming' | 'completed'>('all')

// Event stats cache
const eventStats = ref<Map<string, any>>(new Map())

// Load events on mount
onMounted(async () => {
  await eventsStore.fetchEvents()
  // Load stats for all events
  await loadAllEventStats()
})

// Filtered events based on active filter
const filteredEvents = computed(() => {
  switch (activeFilter.value) {
    case 'active':
      return eventsStore.activeEvents
    case 'upcoming':
      return eventsStore.upcomingEvents
    case 'completed':
      return eventsStore.completedEvents
    default:
      return eventsStore.events
  }
})

// Load stats for all events
async function loadAllEventStats() {
  for (const event of eventsStore.events) {
    const stats = await eventsStore.getEventStats(event.id)
    eventStats.value.set(event.id, stats)
  }
}

// Get stats for a specific event
function getEventStats(eventId: string) {
  return eventStats.value.get(eventId)
}

// Modal handlers
function handleAddEvent() {
  editingEvent.value = null
  showForm.value = true
}

function handleEditEvent(event: Event) {
  editingEvent.value = event
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingEvent.value = null
}

// CRUD operations
async function handleSubmit(data: EventInsert | EventUpdate) {
  if (editingEvent.value) {
    // Update existing event
    const result = await eventsStore.updateEvent(editingEvent.value.id, data as EventUpdate)
    if (result) {
      // Reload stats for updated event
      const stats = await eventsStore.getEventStats(editingEvent.value.id)
      eventStats.value.set(editingEvent.value.id, stats)
      closeForm()
    }
  } else {
    // Create new event
    const newEvent = await eventsStore.createEvent(data as EventInsert)
    if (newEvent) {
      // Load stats for new event
      const stats = await eventsStore.getEventStats(newEvent.id)
      eventStats.value.set(newEvent.id, stats)
      closeForm()
    }
  }
}

function confirmDelete(event: Event) {
  eventToDelete.value = event
  showDeleteConfirm.value = true
}

function cancelDelete() {
  eventToDelete.value = null
  showDeleteConfirm.value = false
}

async function handleDelete() {
  if (eventToDelete.value) {
    try {
      await eventsStore.deleteEvent(eventToDelete.value.id)
      eventStats.value.delete(eventToDelete.value.id)
      cancelDelete()
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }
}

function viewEventDetails(event: Event) {
  router.push({ name: 'event-details', params: { id: event.id } })
}

// Filter tabs
const filterTabs = computed(() => [
  { value: 'all', label: t('events.filters.all') },
  { value: 'active', label: t('events.filters.active') },
  { value: 'upcoming', label: t('events.filters.upcoming') },
  { value: 'completed', label: t('events.filters.completed') },
])
</script>

<template>
  <AppLayout>
    <PageHeader
      :title="t('events.title')"
      :subtitle="t('events.subtitle')"
      :action-label="t('events.createEvent')"
      @action="handleAddEvent"
    />

    <!-- Filter Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="tab in filterTabs"
        :key="tab.value"
        @click="activeFilter = tab.value as any"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
          activeFilter === tab.value
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="eventsStore.isLoading" class="text-center py-12">
      <p class="text-gray-500">{{ t('events.loadingEvents') }}</p>
    </div>

    <!-- Empty State -->
    <EmptyState v-else-if="filteredEvents.length === 0" :message="t('events.noEvents')" />

    <!-- Events Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <EventCard
        v-for="event in filteredEvents"
        :key="event.id"
        :event="event"
        :stats="getEventStats(event.id)"
        @view="viewEventDetails(event)"
        @edit="handleEditEvent(event)"
        @delete="confirmDelete(event)"
      />
    </div>

    <!-- Event Form Modal -->
    <EventForm
      :is-open="showForm"
      :event="editingEvent"
      @close="closeForm"
      @submit="handleSubmit"
    />

    <!-- Delete Confirmation Modal -->
    <EventDeleteModal
      :is-open="showDeleteConfirm"
      :event="eventToDelete"
      @close="cancelDelete"
      @confirm="handleDelete"
    />
  </AppLayout>
</template>

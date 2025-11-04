<script setup lang="ts">
import AppLayout from '@/components/common/AppLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import EventStats from '@/components/events/EventStats.vue'
import EventForm from '@/components/events/EventForm.vue'
import EventDeleteModal from '@/components/events/EventDeleteModal.vue'
import TransactionAccordionRow from '@/components/common/TransactionAccordionRow.vue'
import type { EventUpdate, TransactionWithEvent } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ptBR, enUS } from 'date-fns/locale'
import { useI18n } from '@/composables/useI18n'
import { useEventsStore } from '@/stores/events'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const eventsStore = useEventsStore()

const eventId = computed(() => route.params.id as string)

// State
const event = ref(eventsStore.currentEvent)
const stats = ref<any>(null)
const transactions = ref<TransactionWithEvent[]>([])
const isLoading = ref(true)
const showEditForm = ref(false)
const showDeleteConfirm = ref(false)

// Load event data
onMounted(async () => {
  await loadEventData()
})

async function loadEventData() {
  try {
    isLoading.value = true

    // Fetch event details
    const eventData = await eventsStore.fetchEventById(eventId.value)
    if (eventData) {
      event.value = eventData
    }

    // Fetch event stats
    stats.value = await eventsStore.getEventStats(eventId.value)

    // Fetch event transactions
    transactions.value = await eventsStore.getEventTransactions(eventId.value)
  } catch (error) {
    console.error('Failed to load event data:', error)
  } finally {
    isLoading.value = false
  }
}

// Formatted date range
const formattedDateRange = computed(() => {
  if (!event.value) return ''

  const startDate = format(parseISO(event.value.start_date), 'dd/MM/yyyy', {
    locale: ptBR,
  })

  if (event.value.end_date) {
    const endDate = format(parseISO(event.value.end_date), 'dd/MM/yyyy', {
      locale: ptBR,
    })
    return t('events.details.dateRange', { start: startDate, end: endDate })
  }

  return t('events.details.dateRangeOpen', { start: startDate })
})

// Event status badge
const statusBadge = computed(() => {
  if (!event.value) return { text: '', class: '' }

  const status = eventsStore.getEventStatus(event.value)
  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    upcoming: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
  }

  return {
    text: t(`events.status.${status}`),
    class: statusClasses[status],
  }
})

// Edit event
function handleEdit() {
  showEditForm.value = true
}

async function handleUpdate(data: EventUpdate) {
  if (!event.value) return

  const result = await eventsStore.updateEvent(event.value.id, data)
  if (result) {
    event.value = result
    showEditForm.value = false
  }
}

// Delete event
function handleDeleteClick() {
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!event.value) return

  try {
    await eventsStore.deleteEvent(event.value.id)
    router.push({ name: 'events' })
  } catch (error) {
    console.error('Failed to delete event:', error)
  }
}

// Unlink transaction
async function handleUnlinkTransaction(transactionId: string) {
  try {
    await eventsStore.unlinkTransactionFromEvent(transactionId)
    // Reload data
    await loadEventData()
  } catch (error) {
    console.error('Failed to unlink transaction:', error)
  }
}

// Navigate to add transaction (can be enhanced to pre-fill event_id)
function handleAddTransaction() {
  router.push({ name: 'transactions', query: { eventId: eventId.value } })
}
</script>

<template>
  <AppLayout>
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <p class="text-gray-500">{{ t('common.loading') }}</p>
    </div>

    <!-- Event Not Found -->
    <div v-else-if="!event" class="text-center py-12">
      <EmptyState :message="t('events.noEvents')" />
    </div>

    <!-- Event Details -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <button
                @click="router.back()"
                class="text-gray-600 hover:text-gray-900"
                :aria-label="t('common.cancel')"
              >
                ←
              </button>
              <span v-if="event.icon" class="text-3xl">{{ event.icon }}</span>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ event.name }}</h1>
            </div>
            <div class="flex items-center gap-3 ml-8">
              <p class="text-gray-600">{{ formattedDateRange }}</p>
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', statusBadge.class]">
                {{ statusBadge.text }}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button
              @click="handleEdit"
              class="btn btn-secondary"
              :aria-label="t('events.editEvent')"
            >
              {{ t('common.edit') }}
            </button>
            <button
              @click="handleDeleteClick"
              class="btn text-red-600 hover:bg-red-50"
              :aria-label="t('events.deleteEvent')"
            >
              {{ t('common.delete') }}
            </button>
          </div>
        </div>

        <p v-if="event.description" class="text-gray-700 ml-8">{{ event.description }}</p>
      </div>

      <!-- Stats -->
      <EventStats v-if="stats" :stats="stats" class="mb-8" />

      <!-- Transactions Section -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ t('events.details.transactionsList') }}
          </h2>
          <button @click="handleAddTransaction" class="btn btn-primary">
            {{ t('events.actions.addTransaction') }}
          </button>
        </div>

        <!-- Empty Transactions State -->
        <EmptyState v-if="transactions.length === 0" :message="t('events.stats.noTransactions')" />

        <!-- Transactions List -->
        <div v-else class="space-y-2">
          <TransactionAccordionRow
            v-for="transaction in transactions"
            :key="transaction.id"
            :transaction="transaction"
          >
            <template #actions>
              <button
                @click.stop="handleUnlinkTransaction(transaction.id)"
                class="text-sm text-red-600 hover:underline"
              >
                {{ t('events.actions.unlinkTransaction') }}
              </button>
            </template>
          </TransactionAccordionRow>
        </div>
      </div>
    </div>

    <!-- Edit Form Modal -->
    <EventForm
      :is-open="showEditForm"
      :event="event"
      @close="showEditForm = false"
      @submit="handleUpdate"
    />

    <!-- Delete Confirmation Modal -->
    <EventDeleteModal
      :is-open="showDeleteConfirm"
      :event="event"
      @close="showDeleteConfirm = false"
      @confirm="handleDelete"
    />
  </AppLayout>
</template>

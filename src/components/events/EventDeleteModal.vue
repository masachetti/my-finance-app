<script setup lang="ts">
import Modal from '../common/Modal.vue'
import { useI18n } from '@/composables/useI18n'
import type { Event } from '@/types/database'

const props = defineProps<{
  event: Event | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <Modal
    :model-value="isOpen"
    :title="t('events.delete.title')"
    @update:model-value="$emit('close')"
  >
    <div class="space-y-4">
      <p class="text-gray-700">
        {{ t('events.delete.message') }}
      </p>

      <div v-if="event" class="card bg-gray-50">
        <div class="flex items-center gap-2">
          <span v-if="event.icon" class="text-2xl">{{ event.icon }}</span>
          <div>
            <p class="font-semibold text-gray-900">{{ event.name }}</p>
            <p v-if="event.description" class="text-sm text-gray-600">{{ event.description }}</p>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-4">
        <button type="button" class="btn flex-1" @click="emit('close')">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn bg-red-600 hover:bg-red-700 text-white flex-1"
          @click="emit('confirm')"
        >
          {{ t('events.delete.confirm') }}
        </button>
      </div>
    </div>
  </Modal>
</template>

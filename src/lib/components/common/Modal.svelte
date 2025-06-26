<!-- src/lib/components/common/Modal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let open = false;
  export let title = '';
  export let size = 'medium'; // small, medium, large
  
  const dispatch = createEventDispatcher();
  
  function closeModal() {
    open = false;
    dispatch('close');
  }
  
  function handleOutsideClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  // Get modal size classes
  $: sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl'
  }[size] || 'max-w-lg';
</script>

{#if open}
  <!-- Modal backdrop -->
  <div 
    class="fixed inset-0 z-50 overflow-y-auto"
    on:click={handleOutsideClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
  >
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <!-- This element is to trick the browser into centering the modal contents. -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full {sizeClasses}">
        <!-- Header -->
        {#if title}
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <button
                type="button"
                class="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                on:click={closeModal}
              >
                <span class="sr-only">Close</span>
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        {/if}

        <!-- Content -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
          <slot />
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure modal appears above everything */
  :global(body.modal-open) {
    overflow: hidden;
  }
</style>

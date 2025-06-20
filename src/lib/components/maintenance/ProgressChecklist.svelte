<!-- src/lib/components/maintenance/ProgressChecklist.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { slide, fade } from 'svelte/transition';
    
    export let progressItems = [];
    export let readonly = false;
    
    const dispatch = createEventDispatcher();
    
    // Debug logging
    console.log('ProgressChecklist initialized:', { progressItems, readonly });
    
    // Default progress items for maintenance
    const defaultProgressItems = [
        { id: 1, description: 'Inspeksi awal kondisi alat', notes: '', completed: false },
        { id: 2, description: 'Identifikasi masalah dan kerusakan', notes: '', completed: false },
        { id: 3, description: 'Persiapan tools dan spare parts', notes: '', completed: false },
        { id: 4, description: 'Pelaksanaan perbaikan', notes: '', completed: false },
        { id: 5, description: 'Testing dan quality check', notes: '', completed: false },
        { id: 6, description: 'Dokumentasi dan laporan', notes: '', completed: false }
    ];
    
    // Initialize with default items if empty - FIXED
    $: if (progressItems.length === 0 && !readonly) {
        console.log('Initializing with default items');
        progressItems = [...defaultProgressItems];
    }
    
    // Calculate progress percentage
    $: progressPercentage = progressItems.length > 0 
        ? Math.round((progressItems.filter(item => item.completed).length / progressItems.length) * 100)
        : 0;
    
    // Debug reactive statement
    $: console.log('Progress updated:', { progressPercentage, completedCount: progressItems.filter(item => item.completed).length });
    
    // Dispatch changes to parent - FIXED: Only dispatch when actually changed
    let lastProgressItems = [];
    $: {
        if (!readonly && JSON.stringify(progressItems) !== JSON.stringify(lastProgressItems)) {
            console.log('Dispatching progress change:', { progressItems, progressPercentage });
            dispatch('progress-change', {
                items: progressItems,
                percentage: progressPercentage
            });
            lastProgressItems = [...progressItems];
        }
    }
    
    // Add new progress item
    function addProgressItem() {
        console.log('Adding new progress item');
        const newId = Math.max(...progressItems.map(item => item.id), 0) + 1;
        progressItems = [...progressItems, {
            id: newId,
            description: '',
            notes: '',
            completed: false
        }];
    }
    
    // Remove progress item
    function removeProgressItem(id) {
        console.log('Removing progress item:', id);
        progressItems = progressItems.filter(item => item.id !== id);
    }
    
    // Toggle completion - FIXED
    function toggleCompletion(id) {
        console.log('Toggling completion for item:', id);
        progressItems = progressItems.map(item => {
            if (item.id === id) {
                const updated = { 
                    ...item, 
                    completed: !item.completed,
                    completed_at: !item.completed ? new Date().toISOString() : null
                };
                console.log('Item updated:', updated);
                return updated;
            }
            return item;
        });
        
        // Force reactivity
        progressItems = [...progressItems];
    }
    
    // Update description - FIXED
    function updateDescription(id, description) {
        console.log('Updating description for item:', id, description);
        progressItems = progressItems.map(item => 
            item.id === id ? { ...item, description } : item
        );
        // Force reactivity
        progressItems = [...progressItems];
    }
    
    // Update notes - FIXED
    function updateNotes(id, notes) {
        console.log('Updating notes for item:', id, notes);
        progressItems = progressItems.map(item => 
            item.id === id ? { ...item, notes } : item
        );
        // Force reactivity
        progressItems = [...progressItems];
    }
    
    // Get progress color based on percentage
    function getProgressColor(percentage) {
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 75) return 'bg-blue-500';
        if (percentage >= 50) return 'bg-yellow-500';
        if (percentage >= 25) return 'bg-orange-500';
        return 'bg-red-500';
    }
    
    // Get status text
    function getStatusText(percentage) {
        if (percentage >= 100) return 'Selesai';
        if (percentage >= 75) return 'Hampir Selesai';
        if (percentage >= 50) return 'Setengah Jalan';
        if (percentage >= 25) return 'Baru Dimulai';
        return 'Belum Dimulai';
    }

    // Format timestamp for completed items
    function formatCompletedTime(item) {
        if (!item.completed || !item.completed_at) return '';
        return new Date(item.completed_at).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<div class="space-y-4">
    <!-- Debug Panel (Remove in production) -->
    {#if !readonly}
        <div class="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs">
            <strong>DEBUG:</strong> 
            Items: {progressItems.length}, 
            Completed: {progressItems.filter(item => item.completed).length}, 
            Readonly: {readonly},
            Progress: {progressPercentage}%
        </div>
    {/if}

    <!-- Progress Summary -->
    <div class="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-900 flex items-center">
                <span class="mr-2">📊</span>
                Progress Maintenance
            </h3>
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">{getStatusText(progressPercentage)}</span>
                <span class="text-lg font-bold text-gray-900">{progressPercentage}%</span>
            </div>
        </div>
        
        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
                class="h-4 rounded-full transition-all duration-700 ease-out {getProgressColor(progressPercentage)} shadow-sm"
                style="width: {progressPercentage}%"
            ></div>
        </div>
        
        <!-- Progress Stats -->
        <div class="mt-3 flex items-center justify-between text-xs text-gray-600">
            <span class="flex items-center">
                <span class="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                {progressItems.filter(item => item.completed).length} dari {progressItems.length} selesai
            </span>
            <span class="flex items-center">
                <span class="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                {progressItems.filter(item => !item.completed).length} tersisa
            </span>
        </div>
    </div>

    <!-- Progress Items -->
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-gray-900 flex items-center">
                <span class="mr-2">✅</span>
                Checklist Progress ({progressItems.length} items)
                {#if readonly}
                    <span class="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        View Only
                    </span>
                {/if}
            </h4>
            {#if !readonly}
                <button
                    type="button"
                    on:click={addProgressItem}
                    class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    <span class="mr-1">➕</span>
                    Tambah Item
                </button>
            {/if}
        </div>
        
        {#each progressItems as item, index (item.id)}
            <div 
                class="border rounded-lg p-4 transition-all duration-300"
                class:bg-green-50={item.completed}
                class:border-green-200={item.completed}
                class:bg-white={!item.completed}
                class:border-gray-200={!item.completed}
                class:shadow-sm={item.completed}
                transition:slide={{ duration: 300 }}
            >
                <div class="flex items-start space-x-3">
                    <!-- Checkbox - FIXED -->
                    <div class="flex-shrink-0 pt-1 relative">
                        <input
                            type="checkbox"
                            id="checkbox-{item.id}"
                            checked={item.completed}
                            on:click|preventDefault={() => {
                                console.log('Checkbox clicked for item:', item.id, 'current:', item.completed);
                                if (!readonly) {
                                    toggleCompletion(item.id);
                                }
                            }}
                            disabled={readonly}
                            class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 transition-colors cursor-pointer"
                            class:cursor-not-allowed={readonly}
                        />
                        {#if item.completed}
                            <span class="absolute left-0 top-0 w-5 h-5 flex items-center justify-center pointer-events-none select-none text-green-600 text-lg">
                                ✔️
                            </span>
                        {/if}
                        <label for="checkbox-{item.id}" class="sr-only">
                            Toggle completion for {item.description || 'task ' + (index + 1)}
                        </label>
                    </div>
                    
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <!-- Description -->
                        <div class="mb-3">
                            <label for="desc-{item.id}" class="block text-xs font-medium text-gray-700 mb-1">
                                Deskripsi Pekerjaan
                            </label>
                            <input
                                type="text"
                                id="desc-{item.id}"
                                value={item.description}
                                on:input={(e) => {
                                    console.log('Description input:', e.target.value);
                                    if (!readonly) {
                                        updateDescription(item.id, e.target.value);
                                    }
                                }}
                                placeholder="Deskripsi pekerjaan yang harus dilakukan..."
                                disabled={readonly}
                                class="block w-full px-3 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                class:line-through={item.completed}
                                class:text-gray-500={item.completed}
                            />
                        </div>
                        
                        <!-- Notes -->
                        <div class="mb-3">
                            <label for="notes-{item.id}" class="block text-xs font-medium text-gray-700 mb-1">
                                Keterangan Detail
                            </label>
                            <textarea
                                id="notes-{item.id}"
                                value={item.notes}
                                on:input={(e) => {
                                    console.log('Notes input:', e.target.value);
                                    if (!readonly) {
                                        updateNotes(item.id, e.target.value);
                                    }
                                }}
                                placeholder="Catatan detail, masalah yang ditemukan, solusi yang diterapkan..."
                                rows="3"
                                disabled={readonly}
                                class="block w-full px-3 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                            ></textarea>
                        </div>
                        
                        <!-- Status & Actions -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                {#if item.completed}
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                        <span class="mr-1">✅</span>
                                        Selesai
                                    </span>
                                    {#if item.completed_at}
                                        <span class="text-xs text-green-600">
                                            {formatCompletedTime(item)}
                                        </span>
                                    {/if}
                                {:else}
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                        <span class="mr-1">⏳</span>
                                        Pending
                                    </span>
                                {/if}
                                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    Item #{index + 1}
                                </span>
                                
                                <!-- Debug info -->
                                {#if !readonly}
                                    <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        ID: {item.id}, Completed: {item.completed}
                                    </span>
                                {/if}
                            </div>
                            
                            {#if !readonly && progressItems.length > 1}
                                <button
                                    type="button"
                                    on:click={() => removeProgressItem(item.id)}
                                    class="text-red-600 hover:text-red-800 text-xs font-medium focus:outline-none transition-colors"
                                >
                                    <span class="mr-1">🗑️</span>
                                    Hapus
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>
        {/each}
        
        {#if progressItems.length === 0}
            <div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300" transition:fade>
                <div class="text-4xl mb-2">📋</div>
                <p class="text-sm font-medium">Belum ada checklist progress</p>
                <p class="text-xs mt-1">Tambahkan item untuk mulai tracking progress</p>
                {#if !readonly}
                    <button
                        type="button"
                        on:click={addProgressItem}
                        class="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <span class="mr-2">➕</span>
                        Tambah item pertama
                    </button>
                {/if}
            </div>
        {/if}
    </div>
    
    <!-- Progress Summary Footer -->
    {#if progressItems.length > 0}
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4" transition:fade>
            <div class="flex items-center justify-between text-sm">
                <div class="flex items-center space-x-4">
                    <span class="font-medium text-blue-900 flex items-center">
                        <span class="mr-1">📊</span>
                        Progress: {progressPercentage}%
                    </span>
                    <span class="text-blue-700 flex items-center">
                        <span class="mr-1">✅</span>
                        {progressItems.filter(item => item.completed).length}/{progressItems.length} selesai
                    </span>
                </div>
                <div class="text-xs text-blue-600 font-medium">
                    {#if progressPercentage === 100}
                        <span class="flex items-center">
                            <span class="mr-1">🎉</span>
                            Maintenance selesai!
                        </span>
                    {:else if progressPercentage >= 75}
                        <span class="flex items-center">
                            <span class="mr-1">🚀</span>
                            Hampir selesai
                        </span>
                    {:else if progressPercentage >= 50}
                        <span class="flex items-center">
                            <span class="mr-1">⚡</span>
                            Setengah jalan
                        </span>
                    {:else if progressPercentage > 0}
                        <span class="flex items-center">
                            <span class="mr-1">🔨</span>
                            Sedang dikerjakan
                        </span>
                    {:else}
                        <span class="flex items-center">
                            <span class="mr-1">📝</span>
                            Siap dimulai
                        </span>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Debug Panel Bottom -->
    {#if !readonly}
        <div class="bg-gray-50 border border-gray-200 p-3 rounded text-xs">
            <details>
                <summary class="cursor-pointer font-medium">Debug Info (Click to expand)</summary>
                <pre class="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
{JSON.stringify(progressItems, null, 2)}
                </pre>
            </details>
        </div>
    {/if}
</div>

<style>
    .line-through {
        text-decoration: line-through;
    }
</style>
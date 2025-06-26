<!-- src/routes/maintenance/[id]/progress/+page.svelte -->

<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { maintenanceStore } from '$lib/stores/maintenance.js';
    import ProgressChecklist from '$lib/components/maintenance/ProgressChecklist.svelte';
    import StatusBadge from '$lib/components/common/StatusBadge.svelte';
    
    let maintenance = null;
    let progressItems = [];
    let loading = true;
    let saving = false;
    let error = null;
    let maintenanceId;
    let hasUnsavedChanges = false;
    
    // Get maintenance ID from URL
    $: maintenanceId = $page.params.id;
    
    onMount(async () => {
        await loadMaintenance();
        
        // Auto-save setup
        const autoSaveInterval = setInterval(async () => {
            if (hasUnsavedChanges && !saving && maintenance) {
                await saveProgress(true); // Silent save
            }
        }, 30000); // Every 30 seconds
        
        return () => {
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
        };
    });
    
    async function loadMaintenance() {
        loading = true;
        error = null;
        
        try {
            const maintenanceData = await maintenanceStore.loadMaintenanceById(maintenanceId);
            maintenance = maintenanceData;
            
            // Parse progress items
            if (maintenance.progress_items) {
                try {
                    progressItems = typeof maintenance.progress_items === 'string' 
                        ? JSON.parse(maintenance.progress_items)
                        : maintenance.progress_items;
                } catch (e) {
                    console.error('Error parsing progress items:', e);
                    progressItems = [];
                }
            } else {
                progressItems = [];
            }
            
        } catch (err) {
            error = err.message || 'Gagal memuat data maintenance';
            console.error('Error loading maintenance:', err);
        } finally {
            loading = false;
        }
    }
    
    // Handle progress update
    function handleProgressChange(event) {
        const { items, percentage } = event.detail;
        progressItems = items;
        hasUnsavedChanges = true;
        
        // Auto-update maintenance data
        const updatedData = {
            progress: `${percentage}%`,
            status: maintenance.status,
            completion_date: maintenance.completion_date
        };
        
        // Auto-update status based on progress
        if (percentage === 100 && maintenance.status !== 'completed') {
            updatedData.status = 'completed';
            if (!maintenance.completion_date) {
                updatedData.completion_date = new Date().toISOString().split('T')[0];
            }
        } else if (percentage > 0 && percentage < 100 && maintenance.status === 'pending') {
            updatedData.status = 'in_progress';
        }
        
        // Update local maintenance object
        maintenance = { ...maintenance, ...updatedData };
    }
    
    // Save progress updates
    async function saveProgress(silent = false) {
        saving = true;
        if (!silent) error = null;
        
        try {
            const updateData = {
                progress: maintenance.progress,
                progress_items: JSON.stringify(progressItems),
                status: maintenance.status,
                completion_date: maintenance.completion_date
            };
            
            await maintenanceStore.updateMaintenance(maintenanceId, updateData);
            hasUnsavedChanges = false;
            
            if (!silent) {
                showSuccessMessage('Progress berhasil disimpan!');
            }
            
        } catch (err) {
            if (!silent) {
                error = err.message || 'Gagal menyimpan progress';
            }
            console.error('Error saving progress:', err);
        } finally {
            saving = false;
        }
    }
    
    function showSuccessMessage(message) {
        const successEl = document.createElement('div');
        successEl.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 transition-all duration-300';
        successEl.textContent = message;
        document.body.appendChild(successEl);
        
        setTimeout(() => {
            successEl.classList.add('opacity-0');
            setTimeout(() => {
                if (successEl.parentNode) {
                    successEl.parentNode.removeChild(successEl);
                }
            }, 300);
        }, 3000);
    }
    
    // Format date
    function formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    // Get progress percentage
    function getProgressPercentage(progress) {
        const match = progress?.match(/(\d+)%/);
        return match ? parseInt(match[1]) : 0;
    }
</script>

<svelte:head>
    <title>Update Progress - {maintenance?.tool_id?.name || 'Maintenance'}</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
            <div>
                <nav class="flex text-sm text-gray-500 mb-2">
                    <a href="/maintenance" class="hover:text-gray-700">Maintenance</a>
                    <span class="mx-2">›</span>
                    <span class="text-gray-900">Update Progress</span>
                </nav>
                <h1 class="text-2xl font-bold text-gray-900">
                    Update Progress Maintenance
                </h1>
                {#if maintenance}
                    <p class="mt-1 text-sm text-gray-600">
                        {maintenance.tool_id?.name} - {maintenance.project_id?.name}
                    </p>
                {/if}
            </div>
            
            <div class="flex items-center space-x-3">
                {#if hasUnsavedChanges}
                    <span class="text-sm text-orange-600 font-medium">
                        ⚠️ Ada perubahan belum disimpan
                    </span>
                {/if}
                
                <button
                    on:click={() => saveProgress(false)}
                    disabled={saving || !hasUnsavedChanges}
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {#if saving}
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                    {:else}
                        💾 Simpan Progress
                    {/if}
                </button>
                
                <button
                    on:click={() => goto('/maintenance')}
                    class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    ← Kembali
                </button>
            </div>
        </div>
    </div>

    <!-- Error Message -->
    {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p class="text-sm">{error}</p>
            <button
                on:click={() => error = null}
                class="mt-2 text-sm text-red-700 underline"
            >
                Tutup
            </button>
        </div>
    {/if}

    {#if loading}
        <!-- Loading State -->
        <div class="bg-white rounded-lg shadow p-12">
            <div class="flex justify-center items-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span class="ml-3 text-gray-600">Memuat data maintenance...</span>
            </div>
        </div>
    {:else if maintenance}
        <!-- Maintenance Info -->
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Informasi Maintenance</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <dt class="text-sm font-medium text-gray-500">Alat</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                        <div class="font-medium">{maintenance.tool_id?.name}</div>
                        {#if maintenance.tool_id?.description}
                            <div class="text-gray-600">{maintenance.tool_id.description}</div>
                        {/if}
                    </dd>
                </div>
                
                <div>
                    <dt class="text-sm font-medium text-gray-500">Project</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                        <div class="font-medium">{maintenance.project_id?.name}</div>
                        {#if maintenance.project_id?.lokasi}
                            <div class="text-gray-600">📍 {maintenance.project_id.lokasi}</div>
                        {/if}
                    </dd>
                </div>
                
                <div>
                    <dt class="text-sm font-medium text-gray-500">Status</dt>
                    <dd class="mt-1">
                        <StatusBadge status={maintenance.status} />
                    </dd>
                </div>
                
                <div>
                    <dt class="text-sm font-medium text-gray-500">Progress Saat Ini</dt>
                    <dd class="mt-1">
                        <div class="flex items-center space-x-2">
                            <div class="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style="width: {getProgressPercentage(maintenance.progress)}%"
                                ></div>
                            </div>
                            <span class="text-sm font-medium text-gray-900">{maintenance.progress}</span>
                        </div>
                    </dd>
                </div>
            </div>
            
            <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <dt class="text-sm font-medium text-gray-500">Tanggal Kerusakan</dt>
                    <dd class="mt-1 text-sm text-gray-900">{formatDate(maintenance.damage_date)}</dd>
                </div>
                
                <div>
                    <dt class="text-sm font-medium text-gray-500">Ditugaskan Kepada</dt>
                    <dd class="mt-1 text-sm text-gray-900">{maintenance.assigned_to || '-'}</dd>
                </div>
                
                <div>
                    <dt class="text-sm font-medium text-gray-500">Target Selesai</dt>
                    <dd class="mt-1 text-sm text-gray-900">{formatDate(maintenance.completion_date)}</dd>
                </div>
            </div>
            
            {#if maintenance.notes}
                <div class="mt-6">
                    <dt class="text-sm font-medium text-gray-500">Catatan Umum</dt>
                    <dd class="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                        {maintenance.notes}
                    </dd>
                </div>
            {/if}
        </div>

        <!-- Progress Checklist -->
        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-medium text-gray-900">Update Progress Maintenance</h2>
                <div class="text-sm text-gray-500">
                    {#if hasUnsavedChanges}
                        <span class="text-orange-600">⚠️ Perubahan belum disimpan</span>
                    {:else}
                        <span class="text-green-600">✅ Tersimpan</span>
                    {/if}
                    | 💾 Auto-save setiap 30 detik
                </div>
            </div>
            
            <ProgressChecklist 
                bind:progressItems={progressItems}
                on:progress-change={handleProgressChange}
                readonly={false}
            />
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Aksi Cepat</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    on:click={() => saveProgress(false)}
                    disabled={saving || !hasUnsavedChanges}
                    class="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    💾 Simpan Progress
                </button>
                
                <button
                    on:click={() => goto(`/maintenance/${maintenanceId}/progress`)}
                    class="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    ✏️ Edit Maintenance
                </button>
                
                <button
                    on:click={() => goto('/maintenance')}
                    class="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    📋 Daftar Maintenance
                </button>
            </div>
        </div>
    {:else}
        <!-- Not Found -->
        <div class="bg-white rounded-lg shadow p-12 text-center">
            <div class="text-4xl mb-4">🔍</div>
            <h2 class="text-xl font-medium text-gray-900 mb-2">Maintenance Tidak Ditemukan</h2>
            <p class="text-gray-600 mb-4">Data maintenance dengan ID tersebut tidak dapat ditemukan.</p>
            <button
                on:click={() => goto('/maintenance')}
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                ← Kembali ke Daftar Maintenance
            </button>
        </div>
    {/if}
</div>
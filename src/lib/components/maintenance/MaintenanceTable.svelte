<!-- src/lib/components/maintenance/MaintenanceTable.svelte -->
<script>
  import { maintenanceStore } from '$lib/stores/maintenance.js';
  import StatusBadge from '../common/StatusBadge.svelte';
  import ProgressChecklist from './ProgressChecklist.svelte';
  import { slide } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import jsPDF from 'jspdf';
  
  export let maintenance = [];
  
  let expandedItems = {};
  
  // Format tanggal
  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  
  // Handle edit
  function handleEdit(id) {
    goto(`/maintenance/${id}/edit`);
  }
  
  // Handle update progress
  function handleUpdateProgress(id) {
    goto(`/maintenance/${id}/progress`);
  }
  
  // Handle delete
  async function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      await maintenanceStore.deleteMaintenance(id);
    }
  }
  
  // Get progress percentage from string
  function getProgressPercentage(progress) {
    const match = progress?.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }
  
  // Parse progress items from JSON string
  function parseProgressItems(progressItemsString) {
    if (!progressItemsString) return [];
    try {
      return typeof progressItemsString === 'string' 
        ? JSON.parse(progressItemsString)
        : progressItemsString;
    } catch (e) {
      console.error('Error parsing progress items:', e);
      return [];
    }
  }
  
  // Toggle expanded view for progress details
  function toggleExpanded(id) {
    expandedItems[id] = !expandedItems[id];
    expandedItems = { ...expandedItems };
  }
  
  // Get progress color based on percentage
  function getProgressColor(percentage) {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }
  
  // Get progress status text
  function getProgressStatus(percentage) {
    if (percentage >= 100) return 'Selesai';
    if (percentage >= 75) return 'Hampir Selesai';
    if (percentage >= 50) return 'Setengah Jalan';
    if (percentage >= 25) return 'Baru Dimulai';
    return 'Belum Dimulai';
  }
  
  // Check if maintenance can be updated (not completed)
  function canUpdateProgress(status) {
    return status !== 'completed';
  }

  // Helper function to get progress data for item
  function getProgressData(item) {
    const progressItems = parseProgressItems(item.progress_items);
    const percentage = getProgressPercentage(item.progress);
    const completedItems = progressItems.filter(p => p.completed).length;
    
    return {
      progressItems,
      percentage,
      completedItems
    };
  }
  
  // Export maintenance history for a tool as PDF with logo
  async function exportMaintenance(item) {
    const doc = new jsPDF();
    let y = 10;
    // Load logo as base64
    const logoUrl = '/EPI.jpg';
    const logoBase64 = await getBase64FromUrl(logoUrl);
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 150, 5, 40, 15);
      y = 25;
    }
    doc.setFontSize(14);
    doc.text('Riwayat Maintenance Alat', 10, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Alat: ${item.tool_id?.name || '-'}`, 10, y); y += 7;
    doc.text(`Project: ${item.project_id?.name || '-'}`, 10, y); y += 7;
    doc.text(`Status: ${item.status}`, 10, y); y += 7;
    doc.text(`Progress: ${item.progress}`, 10, y); y += 7;
    doc.text(`Tanggal Kerusakan: ${formatDate(item.damage_date)}`, 10, y); y += 7;
    doc.text(`Tanggal Selesai: ${formatDate(item.completion_date)}`, 10, y); y += 7;
    doc.text(`Teknisi: ${item.assigned_to || '-'}`, 10, y); y += 7;
    doc.text(`Catatan: ${item.notes || '-'}`, 10, y); y += 10;
    // Progress Checklist
    if (item.progress_items) {
      try {
        const progressItems = parseProgressItems(item.progress_items);
        doc.text('Progress Checklist:', 10, y); y += 7;
        progressItems.forEach((p, i) => {
          doc.text(`  ${i + 1}. ${p.text} - ${p.completed ? 'Selesai' : 'Belum'}`, 12, y);
          y += 7;
          if (y > 280) { doc.addPage(); y = 10; }
        });
      } catch {}
    }
    doc.save(`riwayat-maintenance-${item.tool_id?.name || item.id}.pdf`);
  }

  // Helper to get base64 from image url
  async function getBase64FromUrl(url) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }
</script>

<div class="overflow-x-auto">
    <div class="min-w-full shadow-sm rounded-lg border border-gray-200"></div>
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Nama Alat
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Status
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Project
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Foto
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Progress
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Tanggal
        </th>
        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          Aksi
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#if maintenance.length === 0}
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-sm text-gray-500">
            <div class="flex flex-col items-center">
              <div class="text-4xl mb-2">📋</div>
              <p class="font-medium">Tidak ada data maintenance</p>
              <p class="text-xs mt-1">Belum ada maintenance yang dibuat</p>
            </div>
          </td>
        </tr>
      {:else}
        {#each maintenance as item (item.id)}
          <tr class="hover:bg-gray-50">
            <!-- Tool Name -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div class="font-medium">
                {item.tool_id?.name || '-'}
              </div>
              {#if item.tool_id?.description}
                <div class="text-xs text-gray-500">
                  {item.tool_id.description}
                </div>
              {/if}
            </td>
            
            <!-- Status -->
            <td class="px-6 py-4 whitespace-nowrap">
              <StatusBadge status={item.status} />
            </td>
            
            <!-- Project Name -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div class="font-medium">
                {item.project_id?.name || '-'}
              </div>
              {#if item.project_id?.lokasi}
                <div class="text-xs text-gray-500">
                  📍 {item.project_id.lokasi}
                </div>
              {/if}
            </td>

            <!-- Photo -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {#if item.photo}
                <a href={`https://directus.eltamaprimaindo.com/assets/${item.photo}`} target="_blank" rel="noopener noreferrer">
                  <img src={`https://directus.eltamaprimaindo.com/assets/${item.photo}`} alt="Foto Kerusakan" class="h-16 w-16 object-cover rounded border hover:scale-110 transition-transform duration-200" />
                </a>
              {:else}
                <span class="text-xs text-gray-400">-</span>
              {/if}
            </td>
            
            <!-- Progress with Enhanced Display -->
            <td class="px-6 py-4 whitespace-nowrap">
              {#if item.progress_items}
                <!-- FIXED: Move {@const} inside the #if block -->
                {@const progressData = getProgressData(item)}
                
                <div class="space-y-2">
                  <!-- Progress Bar -->
                  <div class="flex items-center space-x-2">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        class="h-2 rounded-full transition-all duration-300 {getProgressColor(progressData.percentage)}"
                        style="width: {progressData.percentage}%"
                      ></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">{progressData.percentage}%</span>
                  </div>
                  
                  <!-- Progress Details -->
                  <div class="flex items-center justify-between">
                    <div class="text-xs text-gray-600">
                      {progressData.completedItems}/{progressData.progressItems.length} selesai
                    </div>
                    {#if progressData.progressItems.length > 0}
                      <button
                        on:click={() => toggleExpanded(item.id)}
                        class="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
                      >
                        {expandedItems[item.id] ? 'Tutup' : 'Detail'}
                      </button>
                    {/if}
                  </div>
                  
                  <!-- Status Badge -->
                  <div>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      {progressData.percentage >= 100 ? 'bg-green-100 text-green-800' : 
                       progressData.percentage >= 75 ? 'bg-blue-100 text-blue-800' :
                       progressData.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                       progressData.percentage >= 25 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
                      {getProgressStatus(progressData.percentage)}
                    </span>
                  </div>
                </div>
              {:else}
                <!-- Fallback to simple progress display -->
                <div class="flex items-center">
                  <div class="w-20 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style="width: {getProgressPercentage(item.progress)}%"
                    ></div>
                  </div>
                  <span class="text-sm text-gray-900">{item.progress || '0%'}</span>
                </div>
              {/if}
            </td>
            
            <!-- Dates -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div>
                <div class="font-medium">Kerusakan:</div>
                <div>{formatDate(item.damage_date)}</div>
              </div>
              {#if item.completion_date}
                <div class="mt-1">
                  <div class="font-medium text-green-700">Selesai:</div>
                  <div>{formatDate(item.completion_date)}</div>
                </div>
              {/if}
              <div class="mt-1">
                <div class="text-xs text-gray-500">Teknisi:</div>
                <div class="text-xs">{item.assigned_to || 'Belum ditugaskan'}</div>
              </div>
            </td>
            
            <!-- Actions -->
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
              <div class="flex flex-col items-center space-y-2">
                <!-- Show History Button -->
                <div class="flex space-x-1 mb-1">
                  <button
                    on:click={() => goto(`/maintenance/${item.id}`)}
                    class="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Lihat Riwayat Maintenance"
                  >
                    🕑 Show
                  </button>
                  <button
                    on:click={() => exportMaintenance(item)}
                    class="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500"
                    title="Export Riwayat Maintenance"
                  >
                    ⬇️ Export
                  </button>
                </div>
                <!-- Update Progress Button -->
                {#if canUpdateProgress(item.status)}
                  <button
                    on:click={() => handleUpdateProgress(item.id)}
                    class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    📊 Progress
                  </button>
                {/if}
                <!-- Secondary Actions -->
                <div class="flex items-center space-x-2">
                  <!-- <button
                    on:click={() => handleEdit(item.id)}
                    class="text-indigo-600 hover:text-indigo-900 text-xs"
                  >
                    ✏️ Edit
                  </button> -->
                  <button
                    on:click={() => handleDelete(item.id)}
                    class="text-red-600 hover:text-red-900 text-xs"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Expanded Progress Details Row -->
          {#if expandedItems[item.id] && item.progress_items}
            <!-- FIXED: Move {@const} to be immediate child of {#if} -->
            {@const expandedProgressData = getProgressData(item)}
            <tr transition:slide={{ duration: 300 }}>
              <td colspan="6" class="px-6 py-4 bg-gray-50">                
                <div class="max-w-4xl">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-medium text-gray-900">
                      Detail Progress Maintenance
                    </h4>
                    {#if canUpdateProgress(item.status)}
                      <button
                        on:click={() => handleUpdateProgress(item.id)}
                        class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        🚀 Update Progress
                      </button>
                    {/if}
                  </div>
                  
                  <!-- Progress Summary Stats -->
                  <div class="bg-white rounded-lg p-4 mb-4 border border-blue-200">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{expandedProgressData.percentage}%</div>
                        <div class="text-xs text-gray-500">Progress</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">{expandedProgressData.completedItems}</div>
                        <div class="text-xs text-gray-500">Selesai</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-orange-600">{expandedProgressData.progressItems.length - expandedProgressData.completedItems}</div>
                        <div class="text-xs text-gray-500">Tersisa</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-gray-600">{expandedProgressData.progressItems.length}</div>
                        <div class="text-xs text-gray-500">Total</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Detailed Progress Checklist -->
                  <ProgressChecklist 
                    progressItems={expandedProgressData.progressItems}
                    readonly={true}
                  />
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      {/if}
    </tbody>
  </table>
</div>
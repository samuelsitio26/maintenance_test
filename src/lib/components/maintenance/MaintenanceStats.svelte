<!-- src/lib/components/maintenance/MaintenanceStats.svelte -->
<script>
    export let stats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      underMaintenance: 0
    };
    
    const statCards = [
      {
        label: 'Total Maintenance',
        value: () => stats.total,
        icon: '📊',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-900'
      },
      {
        label: 'Pending',
        value: () => stats.pending,
        icon: '⏳',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-900'
      },
      {
        label: 'On Process',
        value: () => stats.inProgress,
        icon: '🔄',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-900'
      },
      {
        label: 'Under Maintenance',
        value: () => stats.underMaintenance,
        icon: '🔧',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-900'
      },
      {
        label: 'Completed',
        value: () => stats.completed,
        icon: '✅',
        bgColor: 'bg-green-50',
        textColor: 'text-green-900'
      }
    ];
  </script>
  
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    {#each statCards as card}
      <div class="overflow-hidden rounded-lg {card.bgColor} px-4 py-5 shadow sm:p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <span class="text-2xl">{card.icon}</span>
          </div>
          <div class="ml-5 w-0 flex-1">
            <dt class="text-sm font-medium text-gray-500 truncate">
              {card.label}
            </dt>
            <dd class="mt-1 text-3xl font-semibold {card.textColor}">
              {card.value()}
            </dd>
          </div>
        </div>
      </div>
    {/each}
  </div>
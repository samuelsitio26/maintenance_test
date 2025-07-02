<!-- src/routes/+layout.svelte -->
<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, user, checkAuthStatus, logout, hasMaintenanceAccess } from '$lib/stores/auth.js';

	const menuItems = [
		{ path: '/', label: 'Dashboard', icon: '🏠', requireAuth: false },
		{ path: '/tools', label: 'Daftar Alat', icon: '🔧', requireAuth: false },
		{ path: '/Sparepart', label: 'Sparepart', icon: '📦', requireAuth: false },
		{ path: '/Sparepart/rental', label: 'Pengajuan Barang', icon: '📋', requireAuth: true, requireMaintenanceAccess: true },
		{ path: '/maintenance', label: 'Maintenance', icon: '🛠️', requireAuth: false },
		{ path: '/maintenance/pemeliharaan/index', label: 'Pemeliharaan Alat', icon: '🔍', requireAuth: false },
		{ path: '/maintenance/create', label: 'Tambah Perbaikan Alat', icon: '➕', requireAuth: true, requireMaintenanceAccess: true },
		{ path: '/maintenance/pemeliharaan', label: 'Tambah Pemeliharaan Alat', icon: '➕', requireAuth: true, requireMaintenanceAccess: true }
	];

	onMount(() => {
		checkAuthStatus();
	});

	function handleProtectedRoute(path, requireAuth, requireMaintenanceAccess = false) {
		if (requireAuth && !$isAuthenticated) {
			goto('/login');
			return false;
		}
		
		if (requireMaintenanceAccess && !hasMaintenanceAccess($user?.role)) {
			alert('Akses ditolak. Anda memerlukan role Maintenance Admin untuk mengakses fitur ini.');
			return false;
		}
		
		goto(path);
		return true;
	}

	async function handleLogout() {
		logout();
		await goto('/login');
	}

	// Computed untuk cek apakah user memiliki akses maintenance
	$: userHasMaintenanceAccess = $user ? hasMaintenanceAccess($user.role) : false;
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-semibold text-gray-900">
						Sistem Maintenance - PT Eltama Prima Indo
					</h1>
				</div>

				<div class="flex items-center space-x-4">
					{#if $isAuthenticated}
						<div class="flex items-center space-x-3">
							<div class="text-sm text-gray-600">
								<span>Selamat datang, <strong>{$user?.nama_lengkap || $user?.email}</strong></span>
								{#if $user?.role === 'maintenanceadmin'}
									<span class="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
										Maintenance Admin
									</span>
								{:else}
									<span class="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
										User
									</span>
								{/if}
							</div>
							<button
								on:click={handleLogout}
								class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
							>
								<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
								</svg>
								Logout
							</button>
						</div>
					{:else}
						<a
							href="/login"
							class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
						>
							<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m0 0v3H3v2h8v3z"/>
							</svg>
							Login
						</a>
					{/if}
					
					<span class="text-sm text-gray-600">
						{new Date().toLocaleDateString('id-ID', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</span>
				</div>
			</div>
		</div>
	</header>

	<!-- Navigation -->
	<nav class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
			<div class="flex flex-wrap space-x-4">
				{#each menuItems as item}
					{#if item.requireAuth}
						<button
							on:click={() => handleProtectedRoute(item.path, item.requireAuth, item.requireMaintenanceAccess)}
							class="inline-flex items-center px-2 pt-1 pb-2 text-sm font-medium transition-colors cursor-pointer
							{$page.url.pathname === item.path
								? 'text-primary border-b-2 border-primary'
								: 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}
							{(!$isAuthenticated || (item.requireMaintenanceAccess && !userHasMaintenanceAccess)) ? 'opacity-60' : ''}"
						>
							<span class="mr-2">{item.icon}</span>
							{item.label}
							{#if !$isAuthenticated}
								<svg class="w-4 h-4 ml-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
								</svg>
							{:else if item.requireMaintenanceAccess && !userHasMaintenanceAccess}
								<svg class="w-4 h-4 ml-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
								</svg>
							{/if}
						</button>
					{:else}
						<a
							href={item.path}
							class="inline-flex items-center px-2 pt-1 pb-2 text-sm font-medium transition-colors
							{$page.url.pathname === item.path
								? 'text-primary border-b-2 border-primary'
								: 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}"
						>
							<span class="mr-2">{item.icon}</span>
							{item.label}
						</a>
					{/if}
				{/each}
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<slot />
	</main>
</div>

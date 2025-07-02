<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, checkAuthStatus, hasMaintenanceAccess, user } from '$lib/stores/auth.js';

	export let requireMaintenanceAccess = false;

	let mounted = false;
	let authChecked = false;

	onMount(() => {
		mounted = true;
		checkAuthStatus();
		
		// Subscribe to auth status
		const unsubscribe = isAuthenticated.subscribe(async (authenticated) => {
			if (mounted && authChecked) {
				if (!authenticated) {
					// Redirect to login if not authenticated
					await goto('/login');
				} else if (requireMaintenanceAccess && !hasMaintenanceAccess($user?.role)) {
					// Redirect if user doesn't have maintenance access
					alert('Akses ditolak. Anda memerlukan role Maintenance Admin untuk mengakses halaman ini.');
					await goto('/');
				}
			}
			authChecked = true;
		});

		return unsubscribe;
	});

	$: canAccess = $isAuthenticated && (!requireMaintenanceAccess || hasMaintenanceAccess($user?.role));
</script>

{#if canAccess}
	<slot />
{:else if !$isAuthenticated}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="max-w-md w-full space-y-8">
			<div class="text-center">
				<div class="mx-auto h-12 w-12 text-gray-400">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
					</svg>
				</div>
				<h2 class="mt-6 text-3xl font-extrabold text-gray-900">
					Login Diperlukan
				</h2>
				<p class="mt-2 text-sm text-gray-600">
					Silakan login terlebih dahulu untuk mengakses halaman ini
				</p>
				<div class="mt-6">
					<a
						href="/login"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						Login Sekarang
					</a>
				</div>
			</div>
		</div>
	</div>
{:else if requireMaintenanceAccess && !hasMaintenanceAccess($user?.role)}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="max-w-md w-full space-y-8">
			<div class="text-center">
				<div class="mx-auto h-12 w-12 text-red-400">
					<svg fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
					</svg>
				</div>
				<h2 class="mt-6 text-3xl font-extrabold text-gray-900">
					Akses Ditolak
				</h2>
				<p class="mt-2 text-sm text-gray-600">
					Anda memerlukan role <strong>Maintenance Admin</strong> untuk mengakses halaman ini.
				</p>
				<p class="mt-1 text-xs text-gray-500">
					Role Anda saat ini: <strong>{$user?.role || 'Unknown'}</strong>
				</p>
				<div class="mt-6">
					<a
						href="/"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
					>
						Kembali ke Dashboard
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}

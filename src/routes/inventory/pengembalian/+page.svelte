<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let form = {
		rentalId: '',
		itemId: '',
		borrower: '',
		borrowDate: '',
		duration: 1,
		returned: true
	};
	let items = [];
	let rentals = [];
	let loading = false;
	let error = null;

	async function loadData() {
		loading = true;
		try {
			// Ambil data rental yang belum dikembalikan
			const response = await fetch(
				'https://directus.eltamaprimaindo.com/items/rentals?fields=*,barang_id.id,barang_id.name&filter[returned][_eq]=false',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
						'Cache-Control': 'no-cache'
					}
				}
			);
			if (!response.ok) throw new Error('Gagal mengambil data rental');
			const data = await response.json();
			rentals = data.data;
		} catch (err) {
			error = err.message;
			console.error('Error loading data:', err);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		try {
			const payload = {
				returned: true
			};
			const response = await fetch(
				`https://directus.eltamaprimaindo.com/items/rentals/${form.rentalId}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
						'Content-Type': 'application/json',
						'Cache-Control': 'no-cache'
					},
					body: JSON.stringify(payload)
				}
			);
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error('Gagal mengembalikan: ' + errorText);
			}
			alert('Barang berhasil dikembalikan!');
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await loadData();
			resetForm();
		} catch (err) {
			alert('Error: ' + err.message);
			console.error('Error details:', err);
		}
	}

	function resetForm() {
		form = {
			rentalId: '',
			itemId: '',
			borrower: '',
			borrowDate: '',
			duration: 1,
			returned: true
		};
	}

	onMount(loadData);
</script>

<div class="space-y-6 p-6 bg-white-100 min-h-screen">
	<h1 class="text-2xl font-bold text-gray-900">Pengembalian Barang</h1>
	<form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow p-6 space-y-4">
		<div>
			<label class="block text-sm font-medium text-gray-700">Pilih Peminjaman</label>
			<select
				bind:value={form.rentalId}
				class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				required
				disabled={loading}
			>
				<option value="">Pilih Peminjaman</option>
				{#each rentals as rental}
					<option value={rental.id}
						>{rental.barang_id?.name} - {rental.borrower} (Tanggal: {new Date(
							rental.borrow_date
						).toLocaleDateString('id-ID')})</option
					>
				{/each}
			</select>
		</div>
		<div class="flex space-x-4">
			<button
				type="submit"
				class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
				disabled={loading}>Kembalikan</button
			>
			<button
				type="button"
				on:click={resetForm}
				class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
				disabled={loading}>Reset</button
			>
			<button
				type="button"
				on:click={() => (window.history.length > 1 ? window.history.back() : goto('/inventory'))}
				class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
				disabled={loading}
			>
				Kembali
			</button>
		</div>
	</form>
</div>

<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let form = {
		itemId: '',
		borrower: '',
		borrowDate: new Date().toISOString().split('T')[0],
		duration: 1
	};
	let items = [];
	let loading = false;
	let error = null;

	async function loadData() {
		loading = true; 
		try {
			const response = await fetch(
				'https://directus.eltamaprimaindo.com/items/Barang?fields=*,nama_kategori.parent_category',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
						'Cache-Control': 'no-cache'
					}
				}
			);
			if (!response.ok) throw new Error('Gagal mengambil data dari Directus');
			const data = await response.json();
			items = data.data.map((item) => ({
				id: item.id,
				name: item.name,
				category: item.nama_kategori?.parent_category || 'Unknown',
				stockIn: item.StokIn || 0
			}));
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
				barang_id: form.itemId,
				borrower: form.borrower,
				borrow_date: form.borrowDate,
				duration: parseInt(form.duration),
				returned: false
			};
			const response = await fetch('https://directus.eltamaprimaindo.com/items/rentals', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache'
				},
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error('Gagal meminjam: ' + errorText);
			}
			alert('Barang berhasil dipinjam!');
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
			itemId: '',
			borrower: '',
			borrowDate: new Date().toISOString().split('T')[0],
			duration: 1
		};
	}

	onMount(loadData);
</script>

<div class="space-y-6 p-6 bg-white-100 min-h-screen">
	<h1 class="text-2xl font-bold text-gray-900">Peminjaman Barang</h1>
	<form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow p-6 space-y-4">
		<div>
			<label class="block text-sm font-medium text-gray-700">Pilih Barang</label>
			<select
				bind:value={form.itemId}
				class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				required
				disabled={loading}
			>
				<option value="">Pilih Barang</option>
				{#each items as item}
					<option value={item.id}>{item.name} (Stok: {item.stockIn})</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700">Peminjam</label>
			<input
				type="text"
				bind:value={form.borrower}
				required
				class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				disabled={loading}
			/>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700">Tanggal Peminjaman</label>
			<input
				type="date"
				bind:value={form.borrowDate}
				required
				class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				disabled={loading}
			/>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700">Durasi (Hari)</label>
			<input
				type="number"
				bind:value={form.duration}
				min="1"
				required
				class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				disabled={loading}
			/>
		</div>
		<div class="flex space-x-4">
			<button
				type="submit"
				class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
				disabled={loading}>Pinjam</button
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

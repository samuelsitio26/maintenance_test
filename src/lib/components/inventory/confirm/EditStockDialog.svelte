<script>
	import { createEventDispatcher } from 'svelte';
	import Select from 'svelte-select';

	export let show = false;
	export let selectedItem = null;
	export let parentCategories = [];
	export let subCategories = [];

	const dispatch = createEventDispatcher();

	let formData = {
		id: null,
		name: '',
		description: '',
		stockIn: 0,
		status: 'Ready',
		parent_category: '',
		sub_category: ''
	};

	let errors = {};

	const statusOptions = [
		{ value: 'Ready', label: 'Ready' },
		{ value: 'Low Stock', label: 'Low Stock' },
		{ value: 'Out of Stock', label: 'Out of Stock' }
	];

	$: if (selectedItem && selectedItem.id) {
		formData = {
			id: selectedItem.id,
			name: selectedItem.name || '',
			description: selectedItem.description || '',
			stockIn: selectedItem.stockIn ?? 0,
			status: typeof selectedItem.status === 'string' ? selectedItem.status : (selectedItem.status?.value || 'Ready'),
			parent_category: selectedItem.parent_category || '',
			sub_category: selectedItem.sub_category || ''
		};
	}

	function validateForm() {
		errors = {};
		if (formData.stockIn === '' || formData.stockIn < 0) errors.stockIn = 'Stok harus >= 0';
		if (!formData.status || typeof formData.status !== 'string') errors.status = 'Status wajib dipilih';
		return Object.keys(errors).length === 0;
	}

	function handleSubmit() {
		if (validateForm()) {
			dispatch('confirm', {
				id: formData.id,
				stockIn: parseInt(formData.stockIn),
				status: formData.status
			});
		}
	}

	function handleDelete() {
		dispatch('delete', { id: formData.id });
	}

	function handleCancel() {
		dispatch('cancel');
		formData = {
			id: null,
			name: '',
			description: '',
			stockIn: 0,
			status: 'Ready',
			parent_category: '',
			sub_category: ''
		};
		errors = {};
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 w-full max-w-md">
			<h2 class="text-xl font-bold mb-4">Edit Barang di Stok</h2>
			<div class="space-y-4">
				<!-- Nama Barang (readonly) -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Nama Barang</label>
					<input type="text" value={formData.name} class="mt-1 block w-full border rounded-md p-2 bg-gray-100" readonly />
				</div>
				<!-- Kategori (readonly) -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Kategori</label>
					<input type="text" value={formData.parent_category} class="mt-1 block w-full border rounded-md p-2 bg-gray-100" readonly />
				</div>
				<!-- Sub Kategori (readonly) -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Sub Kategori</label>
					<input type="text" value={formData.sub_category} class="mt-1 block w-full border rounded-md p-2 bg-gray-100" readonly />
				</div>
				<!-- Deskripsi (readonly) -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Deskripsi</label>
					<textarea value={formData.description} class="mt-1 block w-full border rounded-md p-2 bg-gray-100" rows="2" readonly></textarea>
				</div>
				<!-- Input Stok (editable) -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Stok</label>
					<input
						type="number"
						bind:value={formData.stockIn}
						class="mt-1 block w-full border rounded-md p-2"
						min="0"
					/>
					{#if errors.stockIn}
						<p class="text-red-500 text-sm mt-1">{errors.stockIn}</p>
					{/if}
				</div>
				<!-- Dropdown Status (editable) -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Status</label>
					<Select
						items={statusOptions}
						bind:value={formData.status}
						placeholder="Pilih status..."
						class="mt-1"
						getOptionLabel={option => option.label}
						getOptionValue={option => option.value}
						on:select={({ detail }) => formData.status = detail.value}
					/>
					{#if errors.status}
						<p class="text-red-500 text-sm mt-1">{errors.status}</p>
					{/if}
				</div>
				<!-- Tombol Aksi -->
				<div class="flex justify-end space-x-2">
					<button
						on:click={handleCancel}
						class="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
					>
						Batal
					</button>
					<button
						on:click={handleDelete}
						class="px-4 py-2 border rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
					>
						Hapus
					</button>
					<button
						on:click={handleSubmit}
						class="px-4 py-2 border rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
					>
						Simpan
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Styling untuk svelte-select */
	:global(.svelte-select) {
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		padding: 0.5rem;
	}
	:global(.svelte-select input) {
		width: 100%;
	}
</style>

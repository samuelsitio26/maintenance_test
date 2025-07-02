import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Store untuk status autentikasi
export const isAuthenticated = writable(false);
export const user = writable(null);

// Function untuk menentukan role berdasarkan email
export function getUserRole(email) {
	if (email === 'maintenance@eltama.com') {
		return 'maintenanceadmin';
	}
	return 'user'; // default role
}

// Function untuk cek apakah user memiliki akses maintenance
export function hasMaintenanceAccess(userRole) {
	return userRole === 'maintenanceadmin';
}

// Function untuk cek status login dari localStorage
export function checkAuthStatus() {
	if (browser) {
		const token = localStorage.getItem('user_token');
		const userData = {
			token: localStorage.getItem('user_token'),
			email: localStorage.getItem('user_email'),
			uid: localStorage.getItem('user_uid'),
			nama_lengkap: localStorage.getItem('user_nama_lengkap'),
			role: localStorage.getItem('user_role')
		};

		if (token && userData.email) {
			isAuthenticated.set(true);
			user.set(userData);
		} else {
			isAuthenticated.set(false);
			user.set(null);
		}
	}
}

// Function untuk logout
export function logout() {
	if (browser) {
		localStorage.removeItem('user_token');
		localStorage.removeItem('user_email');
		localStorage.removeItem('user_uid');
		localStorage.removeItem('user_nama_lengkap');
		localStorage.removeItem('user_role');
		
		isAuthenticated.set(false);
		user.set(null);
	}
}

// Initialize auth status saat app dimuat
if (browser) {
	checkAuthStatus();
}

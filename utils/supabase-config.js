// utils/supabase-config.js - Configuración central de Supabase
// Este archivo es IGUAL para todos los clientes

const SUPABASE_URL = 'https://zorhclhvykikaachfrmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Cloudinary: las fotos (fondos de negocio y servicios) se suben ahi, NO a
// Supabase Storage. El free tier de Supabase da 1GB de storage + 5GB de
// transferencia para TODO el proyecto; Cloudinary da 25 creditos/mes que
// rinden mucho mas y ademas sirve las imagenes por CDN (mejor en Cuba).
// El upload preset es "sin firma": no es un secreto, solo permite subir.
window.CLOUDINARY_CLOUD_NAME = 'uyvla7fj';
window.CLOUDINARY_UPLOAD_PRESET = 'romahub_productos';

console.log('✅ Configuración de Supabase cargada');
console.log('🔗 URL:', SUPABASE_URL);
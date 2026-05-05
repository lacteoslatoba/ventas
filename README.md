# Ventas Repartidor 🚚

Aplicación móvil para la gestión de ventas y repartos, construida con React, Vite y Capacitor.

[![Build Android APK](https://github.com/lacteoslatoba/ventas/actions/workflows/build-apk.yml/badge.svg)](https://github.com/lacteoslatoba/ventas/actions/workflows/build-apk.yml)

## 📱 Descripción

Esta aplicación permite a los repartidores gestionar su catálogo de productos, realizar ventas en tiempo real y sincronizar datos con Supabase. Está diseñada para funcionar como una aplicación nativa en Android mediante Capacitor.

## 🚀 Tecnologías

- **Frontend**: React + Vite
- **Nativo**: Capacitor 8.3.1
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase
- **CI/CD**: GitHub Actions (Generación automática de APK)

## 🛠️ Desarrollo Local

### Requisitos
- Node.js >= 22
- Android Studio (para desarrollo nativo)
- Java 21

### Pasos
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Correr en modo desarrollo:
   ```bash
   npm run dev
   ```
4. Para probar en Android:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

## 🏗️ CI/CD (GitHub Actions)

El proyecto cuenta con un workflow automatizado que:
1. Compila el frontend.
2. Sincroniza con el proyecto Android.
3. Genera un APK de depuración (Debug).
4. Sube el APK como artefacto y crea una **Release** automática en GitHub con cada push a `main`.

---
*Desarrollado por el equipo de Lácteos La Toba.*

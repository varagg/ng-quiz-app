import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Attach global listeners to capture and print runtime errors with more detail
window.addEventListener('error', (ev) => {
  try{
    // eslint-disable-next-line no-console
    console.error('Global error event:', ev.error || ev.message || ev);
  }catch(e){ console.error(e); }
});
window.addEventListener('unhandledrejection', (ev) => {
  try{
    // eslint-disable-next-line no-console
    console.error('Unhandled rejection:', ev.reason || ev);
  }catch(e){ console.error(e); }
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => {
    try{
      // Print structured information if available
      // eslint-disable-next-line no-console
      console.error('Bootstrap error:', err && err.stack ? err.stack : err);
      try{
        // Print own property names and key Angular fields
        // eslint-disable-next-line no-console
        console.error('Bootstrap error properties:', Object.getOwnPropertyNames(err || {}));
        // eslint-disable-next-line no-console
        console.error('ngOriginalError:', (err && (err as any).ngOriginalError) || null);
        // eslint-disable-next-line no-console
        console.error('ngErrorLogger:', (err && (err as any).ngErrorLogger) || null);
        // eslint-disable-next-line no-console
        console.error('message:', err && err.message);
      }catch(e){ /* swallow */ }
    }catch(e){ console.error(e); }
  });

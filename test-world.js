console.log('Testing generate-world-news.mjs...');
import('./scripts/generate-world-news.mjs').then(mod => {
  console.log('✅ Imported successfully');
  console.log('mod:', Object.keys(mod));
}).catch(err => {
  console.error('❌ Error importing:', err);
  console.error('Stack:', err.stack);
});

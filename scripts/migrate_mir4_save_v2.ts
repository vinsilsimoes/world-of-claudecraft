import { runMir4SaveV2Migration } from './mir4_save_v2_migration';

runMir4SaveV2Migration(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

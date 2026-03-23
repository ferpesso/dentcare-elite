/**
 * PM2 Ecosystem Configuration — DentCare Elite V35
 * Uso: pm2 start ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: 'dentcare-v35',
      script: './dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logs
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Estabilidade
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Ignorar em watch mode
      ignore_watch: ['node_modules', 'dist/public', 'logs', '.git'],
    }
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: 'seu-servidor.com',
      ref: 'origin/main',
      repo: 'seu-repositorio.git',
      path: '/var/www/dentcare-v35',
      'pre-deploy-local': 'echo "A preparar deploy V35..."',
      'post-deploy': 'pnpm install --frozen-lockfile && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/dentcare-v35/logs'
    }
  }
};

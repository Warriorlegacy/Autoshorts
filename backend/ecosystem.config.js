module.exports = {
  apps: [{
    name: 'autoshorts',
    script: 'dist/server.js',
    interpreter: 'node',
    cwd: './',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    autorestart: true,
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/err.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true
  }]
};

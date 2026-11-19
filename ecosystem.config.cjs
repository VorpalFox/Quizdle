// Config pm2 pour le Raspberry : pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'quizdle',
      script: 'dist/index.js',
      cwd: __dirname,
      restart_delay: 5000,
    },
  ],
}

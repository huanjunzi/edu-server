
const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
router.prefix('/api/index')

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!'
  })
})
router.get('/a', async (ctx, next) => {
    ctx.body = await mysql.findDataById(1).then(res => res[0].name)
})

router.get('/string', async (ctx, next) => {
  ctx.body = 'koa2 string'
})

router.get('/json', async (ctx, next) => {
  ctx.body = {
    title: 'koa2 json'
  }
})

module.exports = router

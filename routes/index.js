
const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
router.prefix('/api/index')
var figlet = require('figlet')

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!'
  })
})

router.get('/string', async (ctx, next) => {
  ctx.body = 'koa2 string'
})

router.get('/json', async (ctx, next) => {
  ctx.body = {
    title: 'koa2 json'
  }
})

router.get('/getEggInfo', async (ctx, next) => {
  figlet('I love beibei never change forever!', function(err, data) {
      if (err) {
        ctx.body = {
          rows: 'Something went wrong...'
        }          
      }
      ctx.body = {
        rows: data
      }
  })
})
module.exports = router

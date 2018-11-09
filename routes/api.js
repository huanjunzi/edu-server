
const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')

router.prefix('/api/api')

router.get('/', function (ctx, next) {
  ctx.body="this is /api"
})

router.get('/findDataById', async (ctx, next) => {
  await mysql.findDataById(ctx.query.id).then(res => {
    if(res[0] && res[0].name) {
      ctx.body = {
        code: 200,
        message: '查找成功',
        name: res[0].name
      }
      return
    }
    ctx.body = {
      code: 404,
      message: '查找失败',
    }
  }
  )

})

router.post('/a', async (ctx, next) => {
  console.log("aaaaa1=",ctx.query)

  ctx.body = await mysql.findDataById(ctx.query.id).then(res => res[0].name)
})


module.exports = router

const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/member')

router.get('/findMember', async (ctx,next) => {
  const r = await mysql.findMember(ctx.request.query)
  if(r.length > 0){
    ctx.body = {
      message: "success",
      rows: r
    }
    return
  }
  ctx.body = {
    message: "failed"
  }
})
module.exports = router

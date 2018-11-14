const router = require('koa-router')()
const mysql = require('../lib/mysql.js')
let _ = require('underscore')
router.prefix('/api/users')

// router.get('/', function (ctx, next) {
//   ctx.body = 'this is a users response!'
// })
router.get('/checkUser', async (ctx,next) => {
  let name = _.toArray(ctx.request.query.name)
  const r = await mysql.findName(name)
  if(r.length > 0) {
    ctx.body = {
      message: "success",
    }
    
  }
  ctx.body = {
    message: "failed"
  } 
  return
})
// 注册用户
router.post('/registerUser', async (ctx, next) => {
  // 将对象转换成数组
  let params = _.toArray(ctx.request.query)
  // let { name, description, origin_price, price,stock } = ctx.request.query
  // console.log("name=",name,description, origin_price, price,stock,)
  await mysql.registerUser(params)

  ctx.body = {
    message: "success",
  }

})

router.get('/loginUser', async (ctx, next) => {
  let params = _.toArray(ctx.request.query)
  const r = await mysql.loginUser(params)
  if(r.length > 0){
    console.log("success=", r)
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

const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const body = require('koa-better-body')
const convert = require('koa-convert');

// var path=require('path')
// var bodyParser = require('koa-bodyparser');
// var ejs=require('ejs');
// var session = require('koa-session-minimal');
// var MysqlStore = require('koa-mysql-session');
// var router=require('koa-router')
// var koaStatic = require('koa-static')
// var mysql = require('./lib/mysql.js')

const index = require('./routes/index')
const users = require('./routes/users')
const  api = require('./routes/api')
const education = require('./routes/education')
const member = require('./routes/member')
const child = require('./routes/child')
// error handler
onerror(app)

// // session存储配置
// const sessionMysqlConfig= {
//   user: config.database.USERNAME,
//   password: config.database.PASSWORD,
//   database: config.database.DATABASE,
//   host: config.database.HOST,
// }
// async function a() {
// let r =await mysql.findDataById(1)
// console.log("r===", r)
// }
// a()
// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(convert(views('views', {
  root: __dirname + '/views',
  default: 'jade',
  extension: 'pug'
})))

app.use(body())
// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
  // console.log("fields=",this.request.fields) 
  //console.log('files',ctx.request.files);//文件
    //从上下文中直接获取  
    // let url = ctx.url;  
    // let ctx_query = ctx.query;  
    // let ctx_querystring = ctx.querystring;  
  
    // ctx.body={  
    //     url,  
    //     ctx_query,  
    //     ctx_querystring  
    // }
})
// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())
app.use(api.routes(), api.allowedMethods())
app.use(education.routes(), education.allowedMethods())
app.use(member.routes(), member.allowedMethods())
app.use(child.routes(), child.allowedMethods())
// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
})



module.exports = app
// console.log(`listening on port ${config.port}`)
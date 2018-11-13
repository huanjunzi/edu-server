
const mysql = require('mysql')
const config = require('../config/default.js')
const _ = require('underscore')
const moment = require('moment')
const xl = require("excel4node")
const utils = require('../utils/utils.js')

// 创建数据库连接池
var pool  = mysql.createPool({
  host     : config.database.HOST,
  user     : config.database.USERNAME,
  password : config.database.PASSWORD,
  database : config.database.DATABASE
})
let query = ( sql, values ) => {
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        return resolve( err )
      } else {
        console.log("_sql=",sql, "_values=",values)
        connection.query(sql, values, ( err, rows) => {
          if ( err ) {
            reject( err )
          } else {
            // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
            var dataString = JSON.stringify(rows);
            var data = JSON.parse(dataString)
            for (let d in data) {
              _.extend(data[d], {create_time : moment(data[d].create_time).format("YYYY-MM-DD hh:mm:ss")})
              _.extend(data[d], {update_time : moment(data[d].update_time).format("YYYY-MM-DD hh:mm:ss")})
            }
            resolve( data )
          }
          connection.release()
        })
      }
    })
  })

}

// 用户登录
let loginUser = (values) => {
  console.log('values=', values, typeof values)
  let _sql = `SELECT * from edu_admin where username=? and pwd=?`
  return query( _sql, values)
}

// 根据id查询单条课程信息
let findOneClass = (values) => {
  let _sql = `SELECT * from edu_class where id = ?`
  return query( _sql, values)
}
// 查询课程
let findClasses = (values) => {
  let {limit, offset, filter, search, params, timeRange} = values
  // '{"class_fee":["普通","加急"]}'
  let filterSql = '1=1'
  let searchSql = ''
  let paramsSql = ''
  let pageSql = ''
  let timeSql = ''
  if (filter !== '{}') {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if (search !== '{}') {
    searchSql = utils.searchValues(search)
  }
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if(limit !== '0' && limit !=='0'){
   pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]') {
    timeSql = utils.dataTimeValues(timeRange)
  }
  let _sql = `SELECT * from edu_class where deleted = 0 and ${filterSql}${searchSql}${paramsSql}${timeSql}${pageSql}`

  return query(_sql)
}

let downloadExcel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await findClasses(values)
  var dataString = JSON.stringify(r)
  console.log('dataString=', dataString)
  var data = JSON.parse(dataString)
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("课程名称")
  ws.cell(1, 2).string("课程费用")
  ws.cell(1, 3).string("课程描述")
  ws.cell(1, 4).string("创建时间")
  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.class_name + '')
    ws.cell(index, 2).string(row.class_fee + '')
    ws.cell(index, 3).string(row.class_description + '')
    ws.cell(index, 4).string(row.create_time + '')
    // 设置列高度
    ws.row(+i + 2).setHeight(60)
  }
  // 设置行宽
  ws.column(1).setWidth(50)
  ws.column(2).setWidth(50)
  ws.column(3).setWidth(50)
  ws.column(4).setWidth(50)


  ctx.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `课程项目${moment().format("YYYY-MM-DD hh:mm:ss")}`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}
// 批量编辑价格
let editClass = async(values) => {
  let { data, class_fee} = values
  console.log('data=', data, 'class_fee=', class_fee)
  data = JSON.parse(data)

  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id , class_fee)
    console.log('arrStr=', arrStr)
    let _sql = `INSERT INTO edu_class (id,class_fee) VALUES (?,?) ON DUPLICATE KEY UPDATE class_fee=VALUES(class_fee)`
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]

}

let createClass = async(values) => {
  let data = JSON.parse(values.data)
  let _sql = `INSERT INTO edu_class (class_name,class_fee, class_description) VALUES (?,?,?) ON DUPLICATE KEY UPDATE class_name=VALUES(class_name),class_fee=VALUES(class_fee),class_description=VALUES(class_description)`
  if(data && data.id) {
    _sql = `INSERT INTO edu_class (id,class_name,class_fee, class_description) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE class_name=VALUES(class_name),class_fee=VALUES(class_fee),class_description=VALUES(class_description)`
  }

  let arrStr = []
  for (let d in data) {
    arrStr.push(data[d])
  }
  // 这里设置class_name为unique 如果class_name有重复的情况 就会进行update的操作
 
  await query(_sql, arrStr)
  return [{ success: 'success'}]
}

let deleteClass = async(values) => {
  let data = JSON.parse(values.class_id)
  console.log("type of values", typeof data)
 
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    console.log("d=", d, "arrStr=", arrStr)
    let _sql = `INSERT INTO edu_class (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)
  }

  return [{ success: 'success'}]

}
module.exports = {
  loginUser,
  findClasses,
  downloadExcel,
  editClass,
  createClass,
  deleteClass,
  findOneClass,
}
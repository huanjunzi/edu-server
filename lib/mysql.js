
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
              _.extend(data[d], {birthday : moment(data[d].birthday).format("YYYY-MM-DD")})
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
let loginUser = async (values) => {
  let _sql = `SELECT * from edu_admin where username=? and pwd=?`
  let result = await query( _sql, values)
  if(!_.isEmpty(result)) {
    updateLoginTime(result)
  }
  return result
}

// 登录成功后记录最后登录成功的时间
let updateLoginTime = async (values) => {
  for( let data of values){
    let arrStr = []
    arrStr.push(data.id, moment().format("YYYY-MM-DD hh:mm:ss"))
    let _sql = `INSERT INTO edu_admin (id,login_time) VALUES (?,?) ON DUPLICATE KEY UPDATE login_time=VALUES(login_time)`
    await query( _sql, arrStr)
  }
}

// 根据id查询单条课程信息
let findOneClass = (values) => {
  let _sql = `SELECT * from edu_class where id = ?`
  return query( _sql, values)
}
// 查询课程
let findClasses = (values) => {
  let {limit, offset, filter, search, params, timeRange, order} = values
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
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if(+offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]') {
    timeSql = utils.dataTimeValues(timeRange)
  }
  let _sql = `SELECT * from edu_class t1 where ${filterSql}${searchSql}${paramsSql}${timeSql}${order}${pageSql}`

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
let editClass = async (values) => {
  let { data, class_fee} = values
  data = JSON.parse(data)
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id , class_fee)
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
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    let _sql = `INSERT INTO edu_class (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)
  }

  return [{ success: 'success'}]

}

let findMember = (values) => {
  let { limit, offset, filter, order, timeRange, params , search} = values
  let pageSql = ''
  let timeSql = ''
  let filterSql = ' 1=1'
  let paramsSql = ''
  let searchSql = ''
  if (filter !== '{}') {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(+offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]') {
    timeSql = utils.dataTimeValues(timeRange)
  }  
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}') {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  const _sql = `SELECT * from edu_member t1 where ${filterSql}${paramsSql}${pageSql}${searchSql}${timeSql}${order}`
  return query(_sql)
}

let editMember = async (values) => {
  let { data } = values
  data = JSON.parse(data)

  for (let d of data) {
    let _sql = `INSERT INTO edu_member (name, parents, age, tel_phone, customer_type,second_name,second_parents,second_tel_phone,second_age,purpose,social_soft,remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),parents=VALUES(parents),age=VALUES(age),tel_phone=VALUES(tel_phone),customer_type=VALUES(customer_type),second_name=VALUES(second_name),second_parents=VALUES(second_parents),second_tel_phone=VALUES(second_tel_phone),second_age=VALUES(second_age),purpose=VALUES(purpose),social_soft=VALUES(social_soft),remark=VALUES(remark)`
    let arrStr = []
    arrStr.push( d.name, d.parents, d.age, d.tel_phone, d.customer_type,d.second_name,d.second_parents,d.second_tel_phone,d.second_age,d.purpose,d.social_soft,d.remark)
    if(d.id){
      arrStr.push(d.id)
      _sql = `INSERT INTO edu_member (name, parents, age, tel_phone, customer_type,second_name,second_parents,second_tel_phone, second_age,purpose,social_soft,remark, id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),parents=VALUES(parents),age=VALUES(age),tel_phone=VALUES(tel_phone),customer_type=VALUES(customer_type),second_name=VALUES(second_name),second_parents=VALUES(second_parents),second_tel_phone=VALUES(second_tel_phone),second_age=VALUES(second_age),purpose=VALUES(purpose),social_soft=VALUES(social_soft),remark=VALUES(remark)`
    }
    // console.log("arrStr==", arrStr, "sql_", _sql)
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]
}

let deleteMember = async(values) => {
  let data = JSON.parse(values.member_id) 
  for (let d of data) {
    let arrStr = []
    arrStr.push(d.id,1)
    console.log("d=", d, "arrStr=", arrStr)
    let _sql = `INSERT INTO edu_member (id,deleted) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted=VALUES(deleted)`
    await query(_sql, arrStr)
  }
  return [{ success: 'success'}]
}

// 下载会员信息的Excel
let downloadMemberExcel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await findMember(values)
  let dataString = JSON.stringify(r)
  console.log('dataString=', dataString)
  let data = JSON.parse(dataString)
  let customer = ""
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("家长姓名")
  ws.cell(1, 2).string("家长称呼")
  ws.cell(1, 3).string("家长年纪")
  ws.cell(1, 4).string("手机号")
  ws.cell(1, 5).string("客户类型")
  ws.cell(1, 6).string("孩子数量")
  ws.cell(1, 7).string("沟通次数")
  ws.cell(1, 8).string("创建时间")

  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.name + '')
    ws.cell(index, 2).string(row.parents + '')
    ws.cell(index, 3).string(row.age + '')
    ws.cell(index, 4).string(row.tel_phone + '')

    customer = row.customer_type === '0' ? "非潜在客户" : row.customer_type === "1" ? "潜在客户" : "会员"
    ws.cell(index, 5).string(customer + '')
    ws.cell(index, 6).string(row.childs_count + '')
    ws.cell(index, 7).string(row.contact_count + '')
    ws.cell(index, 8).string(row.create_time + '')

    // 设置列高度
    ws.row(+i + 2).setHeight(60)
  }
  // 设置行宽
  ws.column(1).setWidth(20)
  ws.column(2).setWidth(20)
  ws.column(3).setWidth(20)
  ws.column(4).setWidth(20)
  ws.column(5).setWidth(20)
  ws.column(6).setWidth(20)
  ws.column(7).setWidth(20)
  ws.column(8).setWidth(20)

  ctx.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `家长管理${moment().format("YYYY-MM-DD hhmmss")}`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}
// 查询会员详情
let getMemberDetail = async (values) => {
  let {data} = values
  let _sqlChilds = `SELECT t3.* from edu_member t1 left join edu_parents_childs t2 on t1.id = t2.member_id left join edu_child t3 on t3.id = t2.childs_id 
  where t1.id = ${data} and t1.deleted = 0 and t3.deleted = 0`
  let _sqlParent = `SELECT t1.* from edu_member t1 where t1.id = ${data} and t1.deleted = 0`
  let childs = await query(_sqlChilds)
  let parent = await query(_sqlParent)
  return [{childs: childs},{ parent: parent}]
}
// 修改电话沟通次数
let changeContactCount = async (values) => {
  let { id, count } = values
  let arrStr = []
  arrStr.push(id , count)
  let _sql = `INSERT INTO edu_member (id, contact_count) VALUES (?,?) ON DUPLICATE KEY UPDATE contact_count=VALUES(contact_count)`
  await query(_sql, arrStr)
  return [{ success: 'success'}]
}

// 查看孩子列表
let findChild = (values) => {
  let { limit, offset, filter, order, timeRange, params , search} = values
  let pageSql = ''
  let timeSql = ''
  let filterSql = ' 1=1'
  let paramsSql = ''
  let searchSql = ''
  if (filter !== '{}') {
    filterSql = ''
    filterSql = utils.filterValues(filter)
  }
  if(+offset !== 0) {
    pageSql = ` limit ${limit}, ${offset}`
  }
  if (timeRange !== '["",""]' && timeRange !== '[]') {
    timeSql = utils.dataTimeValues(timeRange)
  }
  if (params !== '{}' && !_.isEmpty(params)){
    paramsSql =' and ' + utils.filterValues(params)
  }
  if (search !== '{}') {
    searchSql = utils.fuzzySearch(JSON.parse(search))
  }
  const _sql = `SELECT t2.name,t2.tel_phone,t1.* from edu_child t1 join edu_member t2 join edu_parents_childs t3 on t3.member_id = t2.id and t3.childs_id = t1.id where ${filterSql}${paramsSql}${pageSql}${searchSql}${timeSql}${order}`
  return query(_sql)
}
// 下载儿童信息的Excel
let downloadChildExcel = async (values, ctx) => {
  // nodejs连接MySQL返回的数据有RowDataPacket问题 需要转成json格式
  let r = await findChild(values)
  let dataString = JSON.stringify(r)
  let data = JSON.parse(dataString)
  let member_type = ""
  let sex = ""
  let wb = new xl.Workbook()
  let ws = wb.addWorksheet("Sheet 1")
  ws.cell(1, 1).string("儿童姓名")
  ws.cell(1, 2).string("所属家长")
  ws.cell(1, 3).string("家长电话")
  ws.cell(1, 4).string("儿童性别")
  ws.cell(1, 5).string("儿童年龄")
  ws.cell(1, 6).string("儿童特点")
  ws.cell(1, 7).string("所报课程")
  ws.cell(1, 8).string("会员状态")
  ws.cell(1, 9).string("创建时间")

  for (let i in data) {
    let index = +i + 2
    let row = data[i]
    // 第一个参数代表列 第二个代表行
    ws.cell(index, 1).string(row.child_name + '')
    ws.cell(index, 2).string(row.name + '')
    ws.cell(index, 3).string(row.tel_phone + '')
    sex = row.sex === '0' ? "男" : "女"
    ws.cell(index, 4).string(sex + '')
    ws.cell(index, 5).string(row.age + '')
    ws.cell(index, 6).string(row.specialty + '')
    ws.cell(index, 7).string(row.class_name + '')
    member_type = +row.member_status === 0 ? "非会员" : +row.member_status === 1 ? "会员" : "过期会员"
    ws.cell(index, 8).string(member_type + '')
    ws.cell(index, 9).string(row.create_time + '')
    // 设置列高度
    ws.row(+i + 2).setHeight(60)
  }
  // 设置行宽
  ws.column(1).setWidth(20)
  ws.column(2).setWidth(20)
  ws.column(3).setWidth(20)
  ws.column(4).setWidth(20)
  ws.column(5).setWidth(20)
  ws.column(6).setWidth(20)
  ws.column(7).setWidth(20)
  ws.column(8).setWidth(20)
  ws.column(9).setWidth(20)
  ctx.set('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  ctx.set('Character-Encoding', 'utf-8')
  let fileName = `儿童管理${moment().format("YYYY-MM-DD hhmmss")}`
  ctx.set("Content-Disposition", `attachments; filename=${encodeURIComponent(fileName)}.xlsx`)
  return wb.writeToBuffer()
}

module.exports = {
  loginUser,
  findClasses,
  downloadExcel,
  editClass,
  createClass,
  deleteClass,
  findOneClass,
  findMember,
  editMember,
  deleteMember,
  downloadMemberExcel,
  getMemberDetail,
  findChild,
  changeContactCount,
  downloadChildExcel
}
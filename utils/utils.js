
const _ = require('underscore')
const mysql = require('mysql')

// 处理filter参数 拼接sql
let filterValues = (values)  => {
  let filterSql = ''
  let filter = JSON.parse(values)
  _.map(filter, function(value, key) {
    return filterSql += `t1.${key} in (${value.map(v => `'${v}'` ).join(',')}) and `
  })
  // 去除最后一个and字符串
  filterSql=filterSql.substr(0, filterSql.length-4)
  return filterSql
}
// 处理搜索参数
// let searchValues = (values) => {
//   let searchSql = ''
//   let searchValue = JSON.parse(values)
//   for (key in searchValue) {
//     searchSql = ` and t1.${key} like '%${searchValue[key]}%'`
//   }
//   return searchSql
// }
 // 处理对象参数
let paramsValues = (values) => {
  let paramsSql = ''
  let paramsValue = JSON.parse(values)
    for (key in paramsValue) {
      paramsSql += ` and t1.${key} in ('${paramsValue[key]}')`
    }
  return paramsSql
}

// 处理filter参数 拼接sql
let dataTimeValues = (values)  => {
  let timeSql = ''
  let time = JSON.parse(values)
  let beginTime = time[0]
  let endTime = time[1]
  timeSql = ` and t1.create_time BETWEEN '${beginTime} 00:00:00' and '${endTime} 23:59:59'`
  
  // 去除最后一个and字符串
  return timeSql
}

// 处理和转义搜索参数
let fuzzySearch = (fuzzy) => {
  let searchSql = ''
  for (let likeKey in fuzzy) {
    if (!fuzzy[likeKey]) continue
    let likeValue = mysql.escape(fuzzy[likeKey].toString())
    likeValue = "'%" + likeValue.slice(1,-1) + "%'"
    searchSql += ` and t1.${mysql.escapeId(likeKey)} like ${likeValue}`
  }
  return searchSql
}

module.exports = {
  filterValues,
  paramsValues,
  dataTimeValues,
  fuzzySearch,
}
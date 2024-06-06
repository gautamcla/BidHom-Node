const Pool = require('pg').Pool

/**DB configration start*/
const pool = new Pool({
  user: global.config.DB_USER,
  host: global.config.DB_HOST,
  database: global.config.DB_NAME,
  password: global.config.DB_PASS,
  port: 5432,
})

pool.connect((err, result) => {
    if (err) {
        //throw new Error(err)
        console.log("DB not connected")
        console.log(err)
        return
    }else{
        console.log("Db connected")
    }
});

module.exports = pool;

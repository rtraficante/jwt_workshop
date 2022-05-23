const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define(
  "user",
  {
    username: STRING,
    password: STRING,
  },
  {
    hooks: {
      beforeCreate: async (user, options) => {
        const hash = await bcrypt.hash(user.password, 5);
        user.password = hash;
      },
    },
  }
);

User.byToken = async (token) => {
  try {
    const user = await jwt.verify(token, process.env.JWT);
    //console.log('USER',user)

    if (user) {
      const verifiedUser = await User.findByPk(user.userId);
      //console.log('VERIFIED',verifiedUser)
      return verifiedUser;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {


  const user = await User.findOne({
    where: {
      username,
      //password,
    },
  });
  const verified = await bcrypt.compare(password, user.password)

  if (verified) {
    console.log('ran')
    const userAuthen = await jwt.sign({ userId: user.id }, process.env.JWT); //process.env.JWT
    //console.log('USERAUTHEN',userAuthen)
    return userAuthen;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};


const Note = conn.define(
    'note',
    {
       text: STRING 
    }
)


 Note.belongsTo(User)
 User.hasMany(Note)


const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const notes = [
      {text: 'test1'},
      {text: 'test2'},
      {text: 'test3'}
  ];

  const [note1, note2, note3] = await Promise.all(
      notes.map(note => Note.create(note))
  )
  


  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

   

    await lucy.setNotes(note1)
    await moe.setNotes(note2)

  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
        note1,
        note2,
        note3
    }
  };

};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};

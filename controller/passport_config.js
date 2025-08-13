const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = await getUserByEmail(email);
        if (user == null) {
            return done(null, false, {message: 'Email does not exist'});
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
            return done(null, false, {message: 'Incorrect password'});
            }
        } catch (e) {
            return done(e);
        }
    }

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
    passport.serializeUser((user, done) => done(null, user._id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await getUserById(id);
            done(null, user);
        } catch (e) {
            done(e);
        }
    });
}

module.exports = initialize
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = await getUserByEmail(email);
        const now = new Date();
        if (user == null) {
            return done(null, false, {message: 'Invalid email or password'});
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                if (user.lockUntil && user.lockUntil > now) {
                    return done(null, false, { message: 'Too many invalid attempts. Try Again Later.' }); //only reveal lockout if valid credentials
                }
                user.failedLoginAttempts = 0; // reset
                user.lockUntil = null; //reset

                user.last_successful_login = now; //report last succesful login

                await user.save();
                return done(null, user);
            } else {
                if (user.lockUntil && user.lockUntil > now) {
                    return done(null, false, { message: 'Invalid email or password' }); //generic message if wrong credentials
                }

                user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                user.last_unsuccessful_login = now; //report last UNsuccessful login

                if (user.failedLoginAttempts >= 5) {
                    user.lockUntil = new Date(now.getTime() + 10 * 60 * 1000); // 10 min
                    user.failedLoginAttempts = 0; // reset counter after lock
                }
                
                await user.save();
                return done(null, false, {message: 'Invalid email or password'});
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
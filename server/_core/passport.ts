import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as db from '../db';
import { ENV } from './env';

passport.use(new GoogleStrategy({
    clientID: ENV.googleClientId,
    clientSecret: ENV.googleClientSecret,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'), undefined);
      }

      const user = await db.upsertUser({
        openId: profile.id,
        name: profile.displayName,
        email: email,
        loginMethod: 'google',
        lastSignedIn: new Date(),
      });

      const dbUser = await db.getUserByOpenId(profile.id);
      if (!dbUser) {
        return done(new Error('Failed to create or find user'), undefined);
      }

      return done(null, dbUser);
    } catch (error) {
      return done(error, undefined);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

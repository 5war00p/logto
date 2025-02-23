import type { CreateUser, User } from '@logto/schemas';
import { SignUpIdentifier } from '@logto/schemas';
import { getUnixTime } from 'date-fns';
import { Provider } from 'oidc-provider';

import { mockPasswordEncrypted, mockUser, mockUserResponse } from '@/__mocks__';
import { createRequester } from '@/utils/test-utils';

import profileRoutes, { profileRoute } from './profile';

const mockFindUserById = jest.fn(async (): Promise<User> => mockUser);
const mockHasUser = jest.fn(async () => false);
const mockHasUserWithEmail = jest.fn(async () => false);
const mockHasUserWithPhone = jest.fn(async () => false);
const mockUpdateUserById = jest.fn(
  async (_, data: Partial<CreateUser>): Promise<User> => ({
    ...mockUser,
    ...data,
  })
);
const encryptUserPassword = jest.fn(async (password: string) => ({
  passwordEncrypted: password + '_user1',
  passwordEncryptionMethod: 'Argon2i',
}));
const mockArgon2Verify = jest.fn(async (password: string) => password === mockPasswordEncrypted);
const mockGetSession = jest.fn();

jest.mock('oidc-provider', () => ({
  Provider: jest.fn(() => ({
    Session: {
      get: async () => mockGetSession(),
    },
  })),
}));

jest.mock('@/lib/user', () => ({
  ...jest.requireActual('@/lib/user'),
  encryptUserPassword: async (password: string) => encryptUserPassword(password),
}));

jest.mock('@/queries/user', () => ({
  ...jest.requireActual('@/queries/user'),
  findUserById: async () => mockFindUserById(),
  hasUser: async () => mockHasUser(),
  hasUserWithEmail: async () => mockHasUserWithEmail(),
  hasUserWithPhone: async () => mockHasUserWithPhone(),
  updateUserById: async (id: string, data: Partial<CreateUser>) => mockUpdateUserById(id, data),
}));

const mockFindDefaultSignInExperience = jest.fn(async () => ({
  signUp: {
    identifier: SignUpIdentifier.None,
    password: false,
    verify: false,
  },
}));

jest.mock('@/queries/sign-in-experience', () => ({
  findDefaultSignInExperience: jest.fn(async () => mockFindDefaultSignInExperience()),
}));

jest.mock('hash-wasm', () => ({
  argon2Verify: async (password: string) => mockArgon2Verify(password),
}));

describe('session -> profileRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockImplementation(async () => ({
      accountId: 'id',
      loginTs: getUnixTime(new Date()) - 60,
    }));
  });

  const sessionRequest = createRequester({
    anonymousRoutes: profileRoutes,
    provider: new Provider(''),
    middlewares: [
      async (ctx, next) => {
        ctx.addLogContext = jest.fn();
        ctx.log = jest.fn();

        return next();
      },
    ],
  });

  describe('GET /session/profile', () => {
    it('should return current user data', async () => {
      const response = await sessionRequest.get(profileRoute);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual(mockUserResponse);
    });

    it('should throw when the user is not authenticated', async () => {
      mockGetSession.mockImplementationOnce(
        jest.fn(async () => ({
          accountId: undefined,
          loginTs: undefined,
        }))
      );

      const response = await sessionRequest.get(profileRoute);
      expect(response.statusCode).toEqual(401);
    });
  });

  describe('PATCH /session/profile', () => {
    it('should update current user with display name, avatar and custom data', async () => {
      const updatedUserInfo = {
        name: 'John Doe',
        avatar: 'https://new-avatar.cdn.com',
        customData: { gender: 'male', age: '30' },
      };

      const response = await sessionRequest.patch(profileRoute).send(updatedUserInfo);

      expect(mockUpdateUserById).toBeCalledWith('id', expect.objectContaining(updatedUserInfo));
      expect(response.statusCode).toEqual(204);
    });

    it('should throw when the user is not authenticated', async () => {
      mockGetSession.mockImplementationOnce(
        jest.fn(async () => ({
          accountId: undefined,
          loginTs: undefined,
        }))
      );

      const response = await sessionRequest.patch(profileRoute).send({ name: 'John Doe' });
      expect(response.statusCode).toEqual(401);
    });
  });

  describe('PATCH /session/profile/username', () => {
    it('should throw if last authentication time is over 10 mins ago', async () => {
      mockGetSession.mockImplementationOnce(async () => ({
        accountId: 'id',
        loginTs: getUnixTime(new Date()) - 601,
      }));

      const response = await sessionRequest
        .patch(`${profileRoute}/username`)
        .send({ username: 'test' });

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should update username with the new value', async () => {
      const newUsername = 'charles';

      const response = await sessionRequest
        .patch(`${profileRoute}/username`)
        .send({ username: newUsername });

      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({ ...mockUserResponse, username: newUsername });
    });

    it('should throw when username is already in use', async () => {
      mockHasUser.mockImplementationOnce(async () => true);

      const response = await sessionRequest
        .patch(`${profileRoute}/username`)
        .send({ username: 'test' });

      expect(response.statusCode).toEqual(422);
    });
  });

  describe('PATCH /session/profile/password', () => {
    it('should throw if last authentication time is over 10 mins ago', async () => {
      mockGetSession.mockImplementationOnce(async () => ({
        accountId: 'id',
        loginTs: getUnixTime(new Date()) - 601,
      }));

      const response = await sessionRequest
        .patch(`${profileRoute}/password`)
        .send({ password: mockPasswordEncrypted });

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should update password with the new value', async () => {
      const response = await sessionRequest
        .patch(`${profileRoute}/password`)
        .send({ password: mockPasswordEncrypted });

      expect(mockUpdateUserById).toBeCalledWith(
        'id',
        expect.objectContaining({
          passwordEncrypted: 'a1b2c3_user1',
          passwordEncryptionMethod: 'Argon2i',
        })
      );
      expect(response.statusCode).toEqual(204);
    });

    it('should throw if new password is identical to old password', async () => {
      encryptUserPassword.mockImplementationOnce(async (password: string) => ({
        passwordEncrypted: password,
        passwordEncryptionMethod: 'Argon2i',
      }));
      mockArgon2Verify.mockResolvedValueOnce(true);

      const response = await sessionRequest
        .patch(`${profileRoute}/password`)
        .send({ password: 'password' });

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });
  });

  describe('email related APIs', () => {
    it('should throw if last authentication time is over 10 mins ago on linking email', async () => {
      mockGetSession.mockImplementationOnce(async () => ({
        accountId: 'id',
        loginTs: getUnixTime(new Date()) - 601,
      }));

      const response = await sessionRequest
        .patch(`${profileRoute}/email`)
        .send({ primaryEmail: 'test@logto.io' });

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should link email address to the user profile', async () => {
      const mockEmailAddress = 'bar@logto.io';
      const response = await sessionRequest
        .patch(`${profileRoute}/email`)
        .send({ primaryEmail: mockEmailAddress });

      expect(mockUpdateUserById).toBeCalledWith(
        'id',
        expect.objectContaining({
          primaryEmail: mockEmailAddress,
        })
      );
      expect(response.statusCode).toEqual(204);
    });

    it('should throw when email address already exists', async () => {
      mockHasUserWithEmail.mockImplementationOnce(async () => true);

      const response = await sessionRequest
        .patch(`${profileRoute}/email`)
        .send({ primaryEmail: mockUser.primaryEmail });

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should throw when email address is invalid', async () => {
      mockHasUserWithEmail.mockImplementationOnce(async () => true);

      const response = await sessionRequest
        .patch(`${profileRoute}/email`)
        .send({ primaryEmail: 'test' });

      expect(response.statusCode).toEqual(400);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should throw if last authentication time is over 10 mins ago on unlinking email', async () => {
      mockGetSession.mockImplementationOnce(async () => ({
        accountId: 'id',
        loginTs: getUnixTime(new Date()) - 601,
      }));

      const response = await sessionRequest.delete(`${profileRoute}/email`);

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should unlink email address from user', async () => {
      const response = await sessionRequest.delete(`${profileRoute}/email`);
      expect(response.statusCode).toEqual(204);
      expect(mockUpdateUserById).toBeCalledWith(
        'id',
        expect.objectContaining({
          primaryEmail: null,
        })
      );
    });

    it('should throw when no email address found in user on unlinking email', async () => {
      mockFindUserById.mockImplementationOnce(async () => ({ ...mockUser, primaryEmail: null }));
      const response = await sessionRequest.delete(`${profileRoute}/email`);

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });
  });

  describe('phone related APIs', () => {
    it('should throw if last authentication time is over 10 mins ago on linking phone number', async () => {
      mockGetSession.mockImplementationOnce(async () => ({
        accountId: 'id',
        loginTs: getUnixTime(new Date()) - 601,
      }));

      const updateResponse = await sessionRequest
        .patch(`${profileRoute}/phone`)
        .send({ primaryPhone: '6533333333' });

      expect(updateResponse.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should link phone number to the user profile', async () => {
      const mockPhoneNumber = '6533333333';
      const response = await sessionRequest
        .patch(`${profileRoute}/phone`)
        .send({ primaryPhone: mockPhoneNumber });

      expect(mockUpdateUserById).toBeCalledWith(
        'id',
        expect.objectContaining({
          primaryPhone: mockPhoneNumber,
        })
      );
      expect(response.statusCode).toEqual(204);
    });

    it('should throw when phone number already exists on linking phone number', async () => {
      mockHasUserWithPhone.mockImplementationOnce(async () => true);

      const response = await sessionRequest
        .patch(`${profileRoute}/phone`)
        .send({ primaryPhone: mockUser.primaryPhone });

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should throw when phone number is invalid', async () => {
      mockHasUserWithPhone.mockImplementationOnce(async () => true);

      const response = await sessionRequest
        .patch(`${profileRoute}/phone`)
        .send({ primaryPhone: 'invalid' });

      expect(response.statusCode).toEqual(400);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should throw if last authentication time is over 10 mins ago on unlinking phone number', async () => {
      mockGetSession.mockImplementationOnce(async () => ({
        accountId: 'id',
        loginTs: getUnixTime(new Date()) - 601,
      }));

      const response = await sessionRequest.delete(`${profileRoute}/phone`);

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });

    it('should unlink phone number from user', async () => {
      const response = await sessionRequest.delete(`${profileRoute}/phone`);
      expect(response.statusCode).toEqual(204);
      expect(mockUpdateUserById).toBeCalledWith(
        'id',
        expect.objectContaining({
          primaryPhone: null,
        })
      );
    });

    it('should throw when no phone number found in user on unlinking phone number', async () => {
      mockFindUserById.mockImplementationOnce(async () => ({ ...mockUser, primaryPhone: null }));
      const response = await sessionRequest.delete(`${profileRoute}/phone`);

      expect(response.statusCode).toEqual(422);
      expect(mockUpdateUserById).not.toBeCalled();
    });
  });
});

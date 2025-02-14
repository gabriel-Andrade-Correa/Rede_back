import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, birthDate, gender } = req.body;

    // Verifica se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso.' });
    }

    // Cria novo usuário
    const user = new User({
      name,
      email,
      password,
      birthDate,
      gender
    });

    await user.save();

    // Gera token JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao registrar usuário.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Busca usuário e verifica senha
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    // Gera token JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao fazer login.' });
  }
}; 
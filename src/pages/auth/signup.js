import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// material-ui
import {
  Box,
  Button,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
// assets
import {
  LoginOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { LoadingOutlined } from "@ant-design/icons";
// third party
import * as Yup from "yup";
import { Formik } from "formik";
// project import
import useAuth from "../../hooks/useAuth";
import useSnackbar from "../../hooks/useSnackbar";

import GoogleIcon from "../../assets/images/google.svg";

const Signup = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { signup } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();

  const [capsWarning, setCapsWarning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    window.electronAPI.setTitle("Create your account");
  }, []);

  return (
    <Stack
      alignItems="center"
      sx={{
        maxWidth: 440,
        width: "100%",
        minHeight: "100vh",
        color: "white",
        mx: "auto",
        my: "50px",
      }}
    >
      <Box sx={{ mb: 4 }}>
        <img
          src="/assets/images/Frame-16.png"
          alt="logo"
          style={{ height: 56 }}
        />
      </Box>
      <Formik
        initialValues={{
          email: "",
          password: "",
          password_confirm: "",
        }}
        validationSchema={Yup.object().shape({
          email: Yup.string()
            .email("Must be a valid email")
            .max(255)
            .required("Email is required"),
          password: Yup.string()
            .matches(
              /^.*(?=.{8,35})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})(?=.*\d)((?=.*[a-z]){1})((?=.*[A-Z]){1}).*$/,
              "match_error"
            )
            .required("Password is required"),
          password_confirm: Yup.string()
            .oneOf([Yup.ref("password")], "Both passwords need to be the same")
            .required("Confirm password is required"),
        })}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          const response = await signup(values);
          setSubmitting(false);
          if (response.status) {
            successMessage("Success to register. Please login.");
            navigate("/auth/login");
          } else {
            errorMessage(response.message);
          }
        }}
      >
        {({
          handleBlur,
          handleChange,
          handleSubmit,
          errors,
          isSubmitting,
          touched,
          values,
        }) => (
          <form noValidate onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h4" textAlign="center">
                  <b>Create your account</b>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={isSubmitting}
                  startIcon={
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      sx={{ height: 44 }}
                    >
                      <img
                        src={GoogleIcon}
                        alt="google"
                        style={{ width: 36, height: 36 }}
                      />
                    </Stack>
                  }
                  sx={{ borderRadius: "100px" }}
                >
                  Continue with Google
                </Button>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider>
                  <Typography variant="body2">OR</Typography>
                </Divider>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="email-login">Email*</InputLabel>
                  <OutlinedInput
                    id="email-login"
                    type="text"
                    value={values.email}
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    fullWidth
                    error={Boolean(touched.email && errors.email)}
                    size="small"
                    sx={{ color: "white", bgcolor: "#252731" }}
                  />
                  {touched.email && errors.email && (
                    <FormHelperText
                      error
                      id="standard-weight-helper-text-email-login"
                    >
                      {errors.email}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="password-login">Password*</InputLabel>
                  <OutlinedInput
                    fullWidth
                    color={capsWarning ? "warning" : "primary"}
                    error={Boolean(touched.password && errors.password)}
                    id="password-login"
                    type={showPassword ? "text" : "password"}
                    value={values.password}
                    name="password"
                    onBlur={(event) => {
                      setCapsWarning(false);
                      handleBlur(event);
                    }}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.getModifierState("CapsLock")) {
                        setCapsWarning(true);
                      } else {
                        setCapsWarning(false);
                      }
                    }}
                    onChange={handleChange}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((prev) => !prev)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOutlined />
                          ) : (
                            <VisibilityOffOutlined />
                          )}
                        </IconButton>
                      </InputAdornment>
                    }
                    placeholder="Enter password"
                    sx={{ color: "white", bgcolor: "#252731" }}
                  />
                  {capsWarning && (
                    <Typography
                      variant="caption"
                      sx={{ color: "warning.main" }}
                      id="warning-helper-text-password-login"
                    >
                      Caps lock on!
                    </Typography>
                  )}
                  {touched.password &&
                    errors.password &&
                    (errors.password === "match_error" ? (
                      <>
                        <Box sx={{ color: theme.palette.error.main }}>
                          Password must contain:
                          <ul
                            style={{
                              marginBlockStart: "0.25rem",
                              marginBlockEnd: "0.25rem",
                            }}
                          >
                            <li>
                              <Typography variant="body2">
                                Between 8 and 35 characters
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                One uppercase letter
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                One number
                              </Typography>
                            </li>
                            <li>
                              <Typography variant="body2">
                                One special character
                              </Typography>
                            </li>
                          </ul>
                        </Box>
                      </>
                    ) : (
                      <FormHelperText error>{errors.password}</FormHelperText>
                    ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <InputLabel htmlFor="password-confirm">
                  Confirm Password*
                </InputLabel>
                <OutlinedInput
                  id="password-confirm"
                  fullWidth
                  error={Boolean(
                    touched.password_confirm && errors.password_confirm
                  )}
                  type={showPasswordConfirm ? "text" : "password"}
                  value={values.password_confirm}
                  name="password_confirm"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  endAdornment={
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPasswordConfirm((prev) => !prev)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPasswordConfirm ? (
                        <VisibilityOutlined />
                      ) : (
                        <VisibilityOffOutlined />
                      )}
                    </IconButton>
                  }
                  placeholder="Enter confirm password"
                  sx={{ color: "white", bgcolor: "#252731" }}
                />
                {touched.password_confirm && errors.password_confirm && (
                  <FormHelperText error>
                    {errors.password_confirm}
                  </FormHelperText>
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  disableElevation
                  disabled={isSubmitting}
                  fullWidth
                  type="submit"
                  variant="contained"
                  startIcon={
                    isSubmitting ? <LoadingOutlined /> : <LoginOutlined />
                  }
                  size="large"
                >
                  Sign Up
                </Button>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                >
                  <Typography
                    onClick={() => navigate("/auth/login")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    I already have an account. Login
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Stack>
  );
};

export default Signup;

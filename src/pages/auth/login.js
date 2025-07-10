import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// material-ui
import {
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
} from "@mui/material";
// assets
import {
  LoginOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import Loader from "../../components/Loader";
import { LoadingOutlined } from "@ant-design/icons";
// import GoogleIcon from "../../assets/images/google.svg";

// third party
import * as Yup from "yup";
import { Formik } from "formik";
// project import
import useAuth from "../../hooks/useAuth";
import useSnackbar from "../../hooks/useSnackbar";

const Login = () => {
  // const navigate = useNavigate();
  const { login, getLoginNonce } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();

  const [capsWarning, setCapsWarning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState("");
  useEffect(() => {
    getLoginNonce().then((result) => {
      setNonce(result);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    window.electronAPI.setTitle("Login");
  }, []);

  return (
    <>
      {loading && <Loader />}
      <Stack alignItems="center" justifyContent="center" sx={{ maxWidth: 440 }}>
        <Formik
          initialValues={{
            username: "testuser",
            password: "Sertu$12",
            login: "Log in",
            "woocommerce-login-nonce": "",
            _wp_http_referer: "/my-account-2/",
          }}
          validationSchema={Yup.object().shape({
            username: Yup.string().max(255).required("Username is required"),
            password: Yup.string().max(255).required("Password is required"),
          })}
          onSubmit={async (values, { setSubmitting }) => {
            setSubmitting(true);
            const response = await login({
              ...values,
              "woocommerce-login-nonce": nonce,
            });
            setSubmitting(false);
            if (response.status) {
              successMessage("Success to login.");
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
                    <b>Login</b>
                  </Typography>
                </Grid>
                {/* <Grid size={{ xs: 12 }}>
                  <Button
                    fullWidth
                    disabled={isSubmitting}
                    variant="outlined"
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
                </Grid> */}
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                    <InputLabel htmlFor="username-login">
                      Username or email address*
                    </InputLabel>
                    <OutlinedInput
                      id="username-login"
                      type="text"
                      value={values.username}
                      name="username"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="Enter username address"
                      fullWidth
                      error={Boolean(touched.username && errors.username)}
                    />
                    {touched.username && errors.username && (
                      <FormHelperText
                        error
                        id="standard-weight-helper-text-username-login"
                      >
                        {errors.username}
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
                    {touched.password && errors.password && (
                      <FormHelperText
                        error
                        id="standard-weight-helper-text-password-login"
                      >
                        {errors.password}
                      </FormHelperText>
                    )}
                  </Stack>
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
                    Login
                  </Button>
                </Grid>
                {/* <Grid size={{ xs: 12 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={1}
                  >
                    <Typography
                      onClick={() => navigate("/auth/signup")}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      I don{"'"}t have an account. Sign Up
                    </Typography>
                    <Typography>
                      <b>&#xb7;</b>
                    </Typography>
                    <Typography
                      onClick={() => navigate("/auth/forgot")}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      Forgot password?
                    </Typography>
                  </Stack>
                </Grid> */}
              </Grid>
            </form>
          )}
        </Formik>
      </Stack>
    </>
  );
};

export default Login;

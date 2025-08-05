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
  Modal,
  // Divider,
} from "@mui/material";
// assets
import {
  LoginOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { LoadingOutlined } from "@ant-design/icons";
// import GoogleIcon from "../../assets/images/google.svg";

// third party
import * as Yup from "yup";
import { Formik } from "formik";
// project import
import useAuth from "../../hooks/useAuth";
import useSnackbar from "../../hooks/useSnackbar";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();

  const [capsWarning, setCapsWarning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [openCert, setOpenCert] = useState(false);

  useEffect(() => {
    window.electronAPI.checkCert().then((result) => {
      if (!result) setOpenCert(true);
    });
  }, []);

  useEffect(() => {
    window.electronAPI.setTitle("Login");
  }, []);

  const handleInstallCert = () => {
    window.electronAPI.installCert().then((result) => {
      setOpenCert(false);
      if (!result.status) errorMessage(result.message);
    });
  };

  return (
    <>
      <Stack alignItems="center" justifyContent="center" sx={{ maxWidth: 440 }}>
        <Formik
          initialValues={{
            log: "testuser",
            pwd: "Sertu$12",
          }}
          validationSchema={Yup.object().shape({
            log: Yup.string().max(255).required("Username is required"),
            pwd: Yup.string().max(255).required("Password is required"),
          })}
          onSubmit={async (values, { setSubmitting }) => {
            setSubmitting(true);
            const response = await login(values);
            setSubmitting(false);
            if (response.status) {
              successMessage("Success to login.");
              navigate("/main/dashboard");
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
                    <InputLabel htmlFor="log-login">
                      Username or email address*
                    </InputLabel>
                    <OutlinedInput
                      id="log-login"
                      type="text"
                      value={values.log}
                      name="log"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="Enter username or email address"
                      fullWidth
                      error={Boolean(touched.log && errors.log)}
                    />
                    {touched.log && errors.log && (
                      <FormHelperText
                        error
                        id="standard-weight-helper-text-log-login"
                      >
                        {errors.log}
                      </FormHelperText>
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                    <InputLabel htmlFor="pwd-login">Password*</InputLabel>
                    <OutlinedInput
                      fullWidth
                      color={capsWarning ? "warning" : "primary"}
                      error={Boolean(touched.pwd && errors.pwd)}
                      id="pwd-login"
                      type={showPassword ? "text" : "password"}
                      value={values.pwd}
                      name="pwd"
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
                    {touched.pwd && errors.pwd && (
                      <FormHelperText
                        error
                        id="standard-weight-helper-text-pwd-login"
                      >
                        {errors.pwd}
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
      <Modal
        open={openCert}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box className="modal" sx={{ width: 400 }}>
          <Stack spacing={3}>
            <Box>
              <Stack spacing={1} alignItems={"center"}>
                <Typography variant="h6" color="error">
                  Certificate Required
                </Typography>
                <Typography variant="body1">
                  You must install the certificate to use the proxy service.
                </Typography>
              </Stack>
            </Box>
            <Stack
              spacing={3}
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                variant="contained"
                disableElevation
                onClick={handleInstallCert}
              >
                Install
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};

export default Login;

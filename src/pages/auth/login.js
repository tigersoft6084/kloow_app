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
  OutlinedInput,
  Stack,
  Typography,
  Modal,
  // Divider,
} from "@mui/material";
// assets
import {
  // LoginOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
// import { LoadingOutlined } from "@ant-design/icons";
// import GoogleIcon from "../../assets/images/google.svg";
import LogoIcon from "../../assets/images/logo_title.png";

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
  const [openTrusted, setOpenTrusted] = useState(false);
  const [trustedStatus, setTrustedStatus] = useState(false);

  useEffect(() => {
    window.electronAPI.checkCert().then((result) => {
      if (!result) setOpenCert(true);
      else {
        console.log("Checking if certificate is trusted...");
        window.electronAPI.checkCertTrusted().then((trusted) => {
          console.log("Certificate trusted:", trusted);
          if (!trusted) setOpenTrusted(true);
        });
      }
    });
  }, [openCert]);

  useEffect(() => {
    window.electronAPI.setTitle("Login");
  }, []);

  const handleInstallCert = () => {
    window.electronAPI.installCert().then((result) => {
      setOpenCert(false);
      if (!result.status) errorMessage(result.message);
    });
  };

  const handleMarkTrusted = () => {
    if (!trustedStatus) {
      window.electronAPI.markCertTrusted().then((result) => {
        setTrustedStatus(true);
        // close the app to let user restart and apply the trust settings
        if (!result.status) errorMessage(result.message);
      });
    }
    else {
      window.electronAPI.closeApp();
    }

  };

  const [credential, setCredential] = useState({ log: "", pwd: "" });

  useEffect(() => {
    const fetchCredential = async () => {
      const cred = await window.electronAPI.credentialGet();
      setCredential(cred);
    };
    fetchCredential();
  }, []);

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          zIndex: 1,
          background:
            "radial-gradient(40% 40% at 50% 40%, rgba(19, 33, 65, 1) 0%,  rgba(22, 23, 30, 1) 100%)",
        }}
      />
      <Stack
        alignItems="center"
        sx={{
          pt: "100px",
          maxWidth: 375,
          width: "100%",
          minHeight: "100vh",
          color: "white",
          margin: "auto",
          zIndex: 2,
        }}
      >
        <Box sx={{ mb: "60px" }}>
          <img src={LogoIcon} alt="logo" style={{ height: 24 }} />
        </Box>
        <Typography
          textAlign="center"
          sx={{
            fontSize: 24,
            fontWeight: 600,
            lineHeight: "30px",
            letterSpacing: -0.15,
            mb: 4,
          }}
        >
          Log In back to
          <br />
          your account
        </Typography>
        <Formik
          enableReinitialize
          initialValues={{
            log: credential?.log,
            pwd: credential?.pwd,
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
              <Grid container spacing={1}>
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                    <OutlinedInput
                      id="log-login"
                      type="text"
                      value={values.log}
                      name="log"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="Email address"
                      fullWidth
                      error={Boolean(touched.log && errors.log)}
                      size="small"
                      sx={{
                        color: "white",
                        bgcolor: "#252731",
                        border: "solid 1px #343847",
                      }}
                    />
                    {touched.log && errors.log && (
                      <FormHelperText
                        error
                        id="standard-weight-helper-text-log-login"
                        sx={{ fontSize: "14px" }}
                      >
                        {errors.log}
                      </FormHelperText>
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                    <OutlinedInput
                      fullWidth
                      placeholder="Password"
                      color={capsWarning ? "warning" : "primary"}
                      error={Boolean(touched.pwd && errors.pwd)}
                      id="pwd-login"
                      type={showPassword ? "text" : "password"}
                      value={values.pwd}
                      name="pwd"
                      size="small"
                      sx={{
                        color: "white",
                        bgcolor: "#252731",
                        border: "solid 1px #343847",
                      }}
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
                              <VisibilityOutlined sx={{ color: "white" }} />
                            ) : (
                              <VisibilityOffOutlined sx={{ color: "white" }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      }
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
                        sx={{ fontSize: "14px" }}
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
                    size="large"
                    sx={{ mt: 3 }}
                  >
                    Log In
                  </Button>
                </Grid>
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
        <Box
          className="modal"
          sx={{
            width: 560,
            backgroundColor: "#16171E",
            border: "solid 1px #343951",
            borderRadius: "8px",
            py: 4,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Stack spacing={3} alignItems={"center"}>
                <Typography variant="h6" color="error">
                  Certificate Installation
                </Typography>
                <Typography variant="body1" color="white" textAlign="center">
                  Please install our certificate in order to use our service.
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
                size="large"
                sx={{ minWidth: 160 }}
              >
                Install
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>

      <Modal
        open={openTrusted}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box
          className="modal"
          sx={{
            width: 560,
            backgroundColor: "#16171E",
            border: "solid 1px #343951",
            borderRadius: "8px",
            py: 4,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Stack spacing={3} alignItems="center">
                <Typography variant="h6" color="error">
                  Mark Certificate as Trusted
                </Typography>
                <Typography variant="body1" color="white" textAlign="center">
                  To use our service, please mark <strong>&lt;Marketing CA&gt;</strong> as trusted:
                </Typography>
                <Box component="ul" sx={{ textAlign: 'left', color: 'white', pl: 3 }}>
                  <li>Open <strong>Keychain Access</strong> → <strong>System keychain</strong>.</li>
                  <li>Locate <strong>&lt;Marketing CA&gt;</strong> and <strong>double-click</strong> it.</li>
                  <li>Expand <strong>Trust</strong>.</li>
                  <li>Set <strong>“When using this certificate”</strong> → <strong>Always Trust</strong>.</li>
                  <li>Authenticate if prompted.</li>
                </Box>
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
                onClick={handleMarkTrusted}
                size="large"
                sx={{ minWidth: 160 }}
              >
                {trustedStatus ? "All done! Please restart the app." : "Mark as Trusted"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};

export default Login;

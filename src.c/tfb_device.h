#pragma once
#include "tfb_device.h"

typedef struct tfb_device tfb_device_t;

tfb_device_t *tfb_device_create(int id, char *name, char *type);
void tfb_device_dispose(tfb_device_t *device);
